const OpenAI = require('openai');
const planGuard = require('./planGuard.service');
const usageTracker = require('./usageTracker.service');
const embeddingService = require('./embedding.service');
const vectorService = require('./vector.service');

const QA = require('../models/QA');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handle chat message with RAG
 * @param {string} userId 
 * @param {string} message 
 * @returns {Promise<string>}
 */
const handleChat = async (userId, message) => {
    // 1. Validate Active Subscription & Limits
    await planGuard.canSendMessage(userId);

    try {
        // 0. CHECK MANUAL QA FIRST
        // Escape special regex chars to avoid errors if message has them
        const safeMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const manualQA = await QA.findOne({
            userId,
            question: { $regex: new RegExp(`^${safeMessage}$`, 'i') } // Exact match, case insensitive
        });

        // Also try loose match if exact fail? 
        // For now, let's try strict case-insensitive match for the specific question provided.
        // Or simpler: partial match? 
        // The user said: "We already provided the QA then why he answering this".
        // Let's do a slightly broader match or just the one above.
        // Let's do: question contains the message OR message contains the question?
        // User query: "Who are you" -> QA: "Who are you" (match)

        if (manualQA) {
            console.log("Manual QA match found:", manualQA.question);
            await QA.findByIdAndUpdate(manualQA._id, { $inc: { frequency: 1 }, updatedAt: Date.now() });
            return manualQA.answer;
        }

        // 2. Embed user message
        const queryEmbedding = await embeddingService.generateEmbedding(message);

        // 3. Vector Search (Filter by userId)
        // We fetch top 5 chunks
        const similarDocs = await vectorService.searchVectors(userId, queryEmbedding, 5);

        // 4. Check if we found context
        // We can define a threshold for similarity score if needed, but for now just check text.
        if (!similarDocs || similarDocs.length === 0) {
            // "If no context found -> 'I don’t have this information yet.'"
            // However, maybe the chatbot can answer general questions? 
            // Prompt says: "If no context found -> 'I don’t have this information yet.'"
            // This implies STRICT RAG.
            // But usually we check if the score is too low.
            // If we are strictly following "if vectors are empty" (prompt: "Graceful fallback if vectors are empty"),
            // then yes.
            // If similarDocs is empty, it means user has NO data indexed (since we don't have a score threshold in findSimilarVectors yet effectively, it returns top N).
            // So if (similarDocs.length === 0) return ...

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
            temperature: 0.1, // Low temp for factual accuracy
            max_tokens: 500
        });

        const answer = completion.choices[0].message.content;
        const usage = completion.usage; // { prompt_tokens, completion_tokens, total_tokens }

        // 7. Deduct Tokens (Pay-as-you-go)
        if (usage) {
            // We charge 1 Token per AI Token used.
            // 1 INR = 5000 Tokens. 
            // Avg Chat (1000 tokens) = 1000 deducted = ₹0.20 to user.
            await usageTracker.deductTokens(userId, usage.total_tokens);
        } else {
            // Fallback
            await usageTracker.deductTokens(userId, 500);
        }

        return answer;

    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
};

module.exports = {
    handleChat
};
