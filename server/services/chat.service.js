const OpenAI = require('openai');
const crypto = require('crypto');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');

const QA = require('../models/QA');
const User = require('../models/User');
const Cache = require('../models/Cache');
const guardrail = require('./guardrail.service');
const SuggestedQA = require('../models/SuggestedQA');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Lowered from 0.72 → 0.55. Previous threshold was rejecting genuine matches
// on shorter queries (e.g. "return policy?") where embeddings score lower even
// when the KB clearly contains the answer. 0.55 keeps obvious-mismatch filtering
// while recovering legitimate answers we were previously refusing.
const CONFIDENCE_THRESHOLD = 0.55;

// Retrieve more chunks so the LLM has enough evidence to answer, but we cap
// each chunk's length below so total prompt stays bounded.
const TOP_K = 8;
const MAX_CHUNK_CHARS = 700; // ~175 tokens per chunk → ~1400 tokens of context max
const MAX_COMPLETION_TOKENS = 350; // Hard cap on output — forces concise answers

function isGreetingMessage(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim().toLowerCase();
    if (!t) return false;
    // short greetings + common variants
    return /^(hi|hello|hey|hii+|heya|yo|namaste|hola|good\s*(morning|afternoon|evening)|gm|ge|good\s*day)(\b|!|\.|,|\s)/i.test(t);
}

function buildGreetingReply(options = {}) {
    const botName = options.botName ? String(options.botName).trim() : '';
    const configured = options.greetingMessage ? String(options.greetingMessage).trim() : '';
    if (configured) return configured;
    if (botName) return `Hi! I'm ${botName}. How can I help you today?`;
    return `Hi! How can I help you today?`;
}
const MEMORY_MESSAGES_LIMIT = 10;
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * System prompt for RAG answers.
 *
 * Fixes two problems we were seeing:
 *   1) Bot refusing to answer even when the context clearly contains the info
 *      (old prompt was too fearful about "not in context").
 *   2) Long, rambling answers that burned output tokens on big user questions.
 *
 * Rules:
 *   - Reply in the SAME LANGUAGE as the user's question (English / Hindi /
 *     Hinglish / etc). This keeps the bot usable for Indian D2C audiences
 *     without a config flag.
 *   - If the answer IS present in the context (even partially), give it —
 *     don't hide behind "not in context" for synonyms or rephrasings.
 *   - Keep answers tight: 2–4 sentences max, ~60–120 words. Bullet lists only
 *     when the user explicitly asks for steps or a comparison.
 *   - End with a one-line "Summary:" only for answers longer than 3 sentences.
 *   - Only fall back to "I don't have this information yet." when the context
 *     genuinely does not cover the question.
 */
const buildRagSystemPrompt = (contextText) => `You are a helpful customer-support assistant answering questions for this specific business.

RULES
- Answer ONLY using the context below. Do NOT invent policies, prices, dates, URLs, or names.
- Match the user's language exactly (English, Hindi, or Hinglish).
- Be concise. 2-4 sentences, max ~120 words. No preamble like "Based on the context...".
- If the answer is in the context, give it directly even if the user's wording differs (synonyms, typos, rephrasings are fine).
- Use a short bulleted list ONLY when the user explicitly asks for steps, options, or a comparison.
- If (and only if) your answer is longer than 3 sentences, end with a final line: "Summary: <one-sentence takeaway>".
- If the context genuinely does not contain the answer, reply exactly: "I don't have this information yet."

CONTEXT
${contextText}`;

/** Resolve OpenAI model from user preference (e.g. gpt-4o-mini, gpt-4o). */
const resolveModel = (preferred) => {
    const m = (preferred || DEFAULT_MODEL).toLowerCase();
    if (m.includes('gpt-4o') && !m.includes('mini')) return 'gpt-4o';
    return DEFAULT_MODEL;
};

/** Phase 5.4: Lightweight intent + sentiment classification (single call). */
async function classifyIntentAndSentiment(message) {
    try {
        const c = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Reply with exactly two words separated by one space. First word: intent (FAQ, complaint, purchase_intent, support). Second: sentiment (positive, neutral, negative). No other text.' },
                { role: 'user', content: message.slice(0, 500) }
            ],
            temperature: 0,
            max_tokens: 20
        });
        const text = (c.choices[0]?.message?.content || '').trim();
        const [intent, sentiment] = text.split(/\s+/);
        return { intent: intent || 'FAQ', sentiment: sentiment || 'neutral' };
    } catch {
        return { intent: 'FAQ', sentiment: 'neutral' };
    }
}

/**
 * Generate a hash for the query
 * @param {string} query 
 * @returns {string}
 */
const generateQueryHash = (query) => {
    return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
};

/**
 * Handle chat message with RAG and Caching
 * @param {string} userId 
 * @param {string} message 
 * @returns {Promise<string>}
 */
const handleChat = async (userId, message) => {
    const inputCheck = guardrail.checkInput(message, { userId: userId?.toString() });
    if (!inputCheck.pass) {
        throw new Error(inputCheck.reason || 'Your message was blocked by our safety filters. Please rephrase.');
    }
    await planGuard.canSendMessage(userId);

    try {
        // 0. CHECK MANUAL QA FIRST
        const safeMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const manualQA = await QA.findOne({
            userId,
            question: { $regex: new RegExp(`^${safeMessage}$`, 'i') }
        });

        if (manualQA) {
            console.log("Manual QA match found:", manualQA.question);
            await QA.findByIdAndUpdate(manualQA._id, { $inc: { frequency: 1 }, updatedAt: Date.now() });
            return manualQA.answer;
        }

        // --- START CACHE LOGIC ---
        const user = await User.findById(userId).select('knowledgeVersion');
        if (!user) throw new Error("User not found");

        const queryHash = generateQueryHash(message);
        const cachedResponse = await Cache.findOne({
            userId,
            queryHash,
            knowledgeVersion: user.knowledgeVersion
        });

        if (cachedResponse) {
            console.log("Cache hit for query:", message);
            // Fixed 50 credits for cached response (half of a normal chat — cache hits cost us ~nothing).
            await usageTracker.deductTokens(userId, usageTracker.CREDITS_PER_CACHED_CHAT, 'chat', 'Cached AI Response');
            return cachedResponse.answer;
        }
        // --- END CACHE LOGIC ---

        // 2. Embed user message
        const queryEmbedding = await embeddingService.generateEmbedding(message);

        // 3. Vector Search (Filter by userId)
        const similarDocs = await vectorService.searchVectors(userId, queryEmbedding, TOP_K);

        // 4. Check if we found context. If not, allow greeting replies.
        if (!similarDocs || similarDocs.length === 0) {
            if (isGreetingMessage(message)) {
                return buildGreetingReply({});
            }
            return "I don't have this information yet.";
        }

        // 5. Build Strict RAG Prompt (with bounded context to control cost)
        const contextText = similarDocs
            .map(doc => (doc.content || '').slice(0, MAX_CHUNK_CHARS))
            .join("\n\n---\n\n");

        const systemPrompt = buildRagSystemPrompt(contextText);

        // 6. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            temperature: 0.1,
            max_tokens: MAX_COMPLETION_TOKENS
        });

        let answer = completion.choices[0].message.content || '';
        const outputCheck = guardrail.checkOutput(answer, { userId: userId?.toString() });
        if (!outputCheck.pass) answer = outputCheck.sanitized;
        const usage = completion.usage;

        // 7. Fixed-credit deduction (100/chat). Real OpenAI usage stays in `usage` for internal analytics.
        await usageTracker.deductTokens(userId, usageTracker.CREDITS_PER_CHAT, 'chat', 'AI Response');

        // Store in cache
        await Cache.create({
            userId,
            queryHash,
            knowledgeVersion: user.knowledgeVersion,
            answer
        });

        return answer;

    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
};

/**
 * Stream chat response. Supports conversation memory, confidence, intent/sentiment, suggested QA, model choice.
 * @param {string} userId
 * @param {string} message
 * @param {Function} onChunk
 * @param {Function} [onComplete]
 * @param {{ previousMessages?: { role: string, content: string }[], model?: string, conversationId?: string, greetingMessage?: string, botName?: string }} [options]
 */
const handleChatStream = async (userId, message, onChunk, onComplete, options = {}) => {
    const { previousMessages = [], model: preferredModel, conversationId, greetingMessage, botName } = options;
    const send = (payload) => {
        try {
            onChunk(payload);
        } catch (e) {
            console.error('Stream send error:', e);
        }
    };

    const inputCheck = guardrail.checkInput(message, { userId: userId?.toString() });
    if (!inputCheck.pass) {
        send({ type: 'done', error: inputCheck.reason || 'Message blocked by safety filters.' });
        return;
    }
    await planGuard.canSendMessage(userId);

    const addSuggestedQA = async (source) => {
        try {
            await SuggestedQA.create({
                userId,
                question: message.slice(0, 1000),
                source,
                conversationId: conversationId || undefined
            });
        } catch (e) {
            console.error('SuggestedQA create:', e.message);
        }
    };

    try {
        const safeMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const manualQA = await QA.findOne({
            userId,
            question: { $regex: new RegExp(`^${safeMessage}$`, 'i') }
        });

        if (manualQA) {
            await QA.findByIdAndUpdate(manualQA._id, { $inc: { frequency: 1 }, updatedAt: Date.now() });
            for (const char of manualQA.answer) send({ type: 'token', content: char });
            await usageTracker.deductTokens(userId, 0, 'chat', 'Manual QA');
            send({ type: 'done', usage: 0 });
            if (onComplete) await Promise.resolve(onComplete(null, manualQA.answer, 0));
            return;
        }

        const user = await User.findById(userId).select('knowledgeVersion');
        if (!user) {
            send({ type: 'done', error: 'User not found' });
            return;
        }

        const queryHash = generateQueryHash(message);
        const cachedResponse = await Cache.findOne({
            userId,
            queryHash,
            knowledgeVersion: user.knowledgeVersion
        });

        if (cachedResponse) {
            for (const char of cachedResponse.answer) send({ type: 'token', content: char });
            const cachedCost = usageTracker.CREDITS_PER_CACHED_CHAT;
            await usageTracker.deductTokens(userId, cachedCost, 'chat', 'Cached AI Response');
            send({ type: 'done', usage: cachedCost });
            if (onComplete) await Promise.resolve(onComplete(null, cachedResponse.answer, cachedCost));
            return;
        }

        const queryEmbedding = await embeddingService.generateEmbedding(message);
        const similarDocs = await vectorService.searchVectors(userId, queryEmbedding, TOP_K);

        if (!similarDocs || similarDocs.length === 0) {
            if (isGreetingMessage(message)) {
                const greet = buildGreetingReply({ greetingMessage, botName });
                for (const char of greet) send({ type: 'token', content: char });
                send({ type: 'done', usage: 0 });
                if (onComplete) await Promise.resolve(onComplete(null, greet, 0));
                return;
            }
            send({ type: 'confidence', low: true });
            const fallback = "I don't have this information yet.";
            for (const char of fallback) send({ type: 'token', content: char });
            send({ type: 'done', usage: 0 });
            if (onComplete) await Promise.resolve(onComplete(null, fallback, 0));
            addSuggestedQA('no_context');
            return;
        }

        const maxScore = Math.max(...similarDocs.map(d => d.score != null ? d.score : 0));
        const lowConfidence = maxScore < CONFIDENCE_THRESHOLD;
        if (lowConfidence) {
            // For pure greetings, don't waste tokens on low-confidence RAG — answer with a greeting.
            if (isGreetingMessage(message)) {
                const greet = buildGreetingReply({ greetingMessage, botName });
                for (const char of greet) send({ type: 'token', content: char });
                send({ type: 'done', usage: 0 });
                if (onComplete) await Promise.resolve(onComplete(null, greet, 0));
                return;
            }
            send({ type: 'confidence', low: true });
        }

        classifyIntentAndSentiment(message).then(({ intent, sentiment }) => {
            send({ type: 'intent', value: intent });
            send({ type: 'sentiment', value: sentiment });
        }).catch(() => {});

        const contextText = similarDocs
            .map(doc => (doc.content || '').slice(0, MAX_CHUNK_CHARS))
            .join("\n\n---\n\n");
        const systemPrompt = buildRagSystemPrompt(contextText);

        const memorySlice = Array.isArray(previousMessages)
            ? previousMessages.slice(-MEMORY_MESSAGES_LIMIT)
            : [];
        const openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...memorySlice.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
            { role: 'user', content: message }
        ];

        const model = resolveModel(preferredModel);
        const stream = await openai.chat.completions.create({
            model,
            messages: openaiMessages,
            temperature: 0.1,
            max_tokens: MAX_COMPLETION_TOKENS,
            stream: true,
            stream_options: { include_usage: true }
        });

        let fullContent = '';
        let totalTokens = 0;

        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
                fullContent += delta;
                send({ type: 'token', content: delta });
            }
            if (chunk.usage?.total_tokens) totalTokens = chunk.usage.total_tokens;
        }

        const outputCheck = guardrail.checkOutput(fullContent, { userId: userId?.toString() });
        const finalContent = outputCheck.pass ? fullContent : outputCheck.sanitized;
        // Fixed 100 credits/chat. `totalTokens` (real OpenAI usage) is kept in scope for future cost analytics.
        const toDeduct = usageTracker.CREDITS_PER_CHAT;
        await usageTracker.deductTokens(userId, toDeduct, 'chat', 'AI Response');

        if (lowConfidence || /don't have this information|do not have/i.test(finalContent)) {
            addSuggestedQA(lowConfidence ? 'low_confidence' : 'no_context');
        }

        await Cache.create({
            userId,
            queryHash,
            knowledgeVersion: user.knowledgeVersion,
            answer: finalContent
        });

        send({ type: 'done', usage: toDeduct });
        if (onComplete) await Promise.resolve(onComplete(null, finalContent, toDeduct));
    } catch (error) {
        console.error("Chat stream error:", error);
        const msg = error.message?.includes('limit') || error.message?.includes('tokens') || error.message?.includes('balance')
            ? error.message
            : 'Something went wrong. Please try again.';
        send({ type: 'done', error: msg });
        if (onComplete) await Promise.resolve(onComplete(error, '', 0));
    }
};

module.exports = {
    handleChat,
    handleChatStream
};
