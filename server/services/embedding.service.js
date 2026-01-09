const OpenAI = require('openai');
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for a given text
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
const generateEmbedding = async (text) => {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Cost effective & efficient
            input: text,
            encoding_format: "float",
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
};

/**
 * Chunk text into smaller pieces
 * @param {string} text 
 * @param {number} chunkSize 
 * @param {number} chunkOverlap 
 * @returns {Promise<string[]>}
 */
const chunkText = async (text, chunkSize = 1000, chunkOverlap = 200) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });

    const output = await splitter.createDocuments([text]);
    return output.map(doc => doc.pageContent);
};

module.exports = {
    generateEmbedding,
    chunkText
};
