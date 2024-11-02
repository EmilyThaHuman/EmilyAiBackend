// aiController.js
const { myAction } = require('./aiUtils');
const { clearSemanticCache } = require('./semanticCache');

async function handleAIAction(req, res) {
    const { userMessage, mentionTool, logo, file } = req.body;
    if (!userMessage) {
        return res.status(400).json({ error: 'User message is required' });
    }
    try {
        const result = await myAction(userMessage, mentionTool, logo, file);
        res.json(result);
    } catch (error) {
        console.error('Error handling AI action:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    handleAIAction,
    clearSemanticCache
};
