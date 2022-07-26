require('dotenv').config();
const { version } = require('../package.json');

module.exports = {
    APP_NAME: 'IATI Flattener and Schema Converter',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    APPLICATIONINSIGHTS_CONNECTION_STRING: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    NS_PER_SEC: 1e9,
};
