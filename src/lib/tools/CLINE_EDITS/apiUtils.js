// apiUtils.js
async function fetchJson(url, options) {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

module.exports = {
    fetchJson
};
