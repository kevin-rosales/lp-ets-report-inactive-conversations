const dotenv = require('dotenv');
const conversations = require('./src/conversations');

// Initialize dotenv
dotenv.config();

conversations()
  .then(() => console.log('Data finalized'));
