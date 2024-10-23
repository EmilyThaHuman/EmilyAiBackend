const processing = require("./processing");
const api = require("./api");
const ai = require("./ai");
module.exports = {
  ...processing,
  ...api,
  ...ai
};
// module.exports = require('./ai');
// module.exports = require('./auth');
// module.exports = require('./processing');
// module.exports = require('./utils');
// export * from './ai';

// // Exporting from auth directory
// export * from './auth';

// // Exporting from processing directory
// export * from './processing';

// // Exporting other utilities
// export * from './api';
