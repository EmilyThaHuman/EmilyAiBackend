// searchRoutes.js
const express = require('express');
const { getSearchResults } = require('./searchController');

const router = express.Router();

router.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }
    try {
        const results = await getSearchResults(query);
        res.json(results);
    } catch (error) {
        console.error('Error handling search request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
