// backend/config/portkey.js
const Portkey = require('portkey'); // Replace with actual import if different

const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY,
  // Add other Portkey-specific configurations here
});

module.exports = portkey;
