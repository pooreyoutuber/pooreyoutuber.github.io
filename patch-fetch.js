// patch-fetch.js
// This ensures global fetch is available correctly in CommonJS mode
const fetch = require('node-fetch');
global.fetch = fetch;
