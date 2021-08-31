const dotenv = require('dotenv');
const service = require('./src/service');
const downloadCSV = require('./src/utils/convertCSV');

// Initialize dotenv
dotenv.config();

service().then((data) => console.log('Data finalized', downloadCSV(data)));