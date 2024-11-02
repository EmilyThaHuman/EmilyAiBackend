// aiRoutes.js
const express = require('express');
const { handleAIAction, clearSemanticCache } = require('./aiController');

const router = express.Router();

router.post('/ai/action', handleAIAction);
router.post('/ai/clear-cache', (req, res) => {
    try {
        clearSemanticCache();
        res.json({ message: 'Semantic cache cleared' });
    } catch (error) {
        console.error('Error clearing semantic cache:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
