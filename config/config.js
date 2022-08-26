import 'dotenv/config';
import { readFile } from 'fs/promises';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

const config = {
    APP_NAME: 'IATI Flattener and Schema Converter',
    VERSION: version,
    NODE_ENV: process.env.NODE_ENV,
    APPLICATIONINSIGHTS_CONNECTION_STRING: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    NS_PER_SEC: 1e9,
};

export default config;
