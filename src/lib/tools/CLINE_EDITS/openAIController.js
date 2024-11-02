// openAIController.js
const { streamingChatCompletion } = require('./openAIUtils');

async function handleStreamingChatCompletion(req, res) {
    const { userMessage, vectorResults, streamable } = req.body;
    if (!userMessage || !vectorResults || !streamable) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        const result = await streamingChatCompletion(userMessage, vectorResults, streamable);
        res.json({ result });
    } catch (error) {
        console.error('Error handling streaming chat completion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    handleStreamingChatCompletion
};
