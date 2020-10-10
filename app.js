const dotenv = require('dotenv');
const service = require('./src/service');

// Initialize dotenv
dotenv.config();

service()
  .then(() => console.log('Data finalized'));
