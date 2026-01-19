const OpenAI = require('openai');
const crypto = require('crypto');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');

const QA = require('../models/QA');
const User = require('../models/User');
const Cache = require('../models/Cache');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
    // 1. Validate Active Subscription & Limits
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
            // Deduct flat tokens for cached response (Discounted: 50% of Industry Avg)
            await usageTracker.deductTokens(userId, 900, 'chat', 'Cached AI Response');
            return cachedResponse.answer;
        }
        // --- END CACHE LOGIC ---

        // 2. Embed user message
        const queryEmbedding = await embeddingService.generateEmbedding(message);

        // 3. Vector Search (Filter by userId)
        const similarDocs = await vectorService.searchVectors(userId, queryEmbedding, 5);

        // 4. Check if we found context
        if (!similarDocs || similarDocs.length === 0) {
            return "I don't have this information yet.";
        }

        // 5. Build Strict RAG Prompt
        const contextText = similarDocs.map(doc => doc.content).join("\n\n---\n\n");

        const systemPrompt = `You are an AI assistant for a specific user. 
You must ONLY answer based on the provided context below.
If the answer is not in the context, say "I don't have this information yet."
Do not halluncinate or use outside knowledge.

Context:
${contextText}`;

        // 6. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            temperature: 0.1,
            max_tokens: 500
        });

        const answer = completion.choices[0].message.content;
        const usage = completion.usage;

        // 7. Deduct Tokens & Cache Answer
        if (usage) {
            await usageTracker.deductTokens(userId, usage.total_tokens, 'chat', 'AI Response');
        } else {
            await usageTracker.deductTokens(userId, 500, 'chat', 'AI Response');
        }

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

module.exports = {
    handleChat
};
