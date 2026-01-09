const OpenAI = require('openai');

const getAIResponse = async (question) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "",
    });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: 'system', content: 'Only answer questions relevant to the website content.' }, { role: 'user', content: question }],
            temperature: 0.7,
            max_tokens: 100,
        });

        return completion.choices[0]?.message?.content || "I'm not sure about that.";
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        throw error;
    }
};

module.exports = { getAIResponse };
