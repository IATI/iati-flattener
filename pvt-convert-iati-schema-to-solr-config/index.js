const { DOMParser } = require('@xmldom/xmldom');
const schemaConverter = require('../schema/converter');

module.exports = async (context, req) => {
    const { body } = req;

    // No body
    if (!body || JSON.stringify(body) === '{}') {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'No body' },
        };

        return;
    }

    // Body should be a string
    if (typeof body !== 'string') {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Body must be an application/xml string' },
        };

        return;
    }

    const xmlDoc = new DOMParser().parseFromString(body);

    const solrConfig = await schemaConverter.getSolrConfigFromIatiSchema(xmlDoc);

    context.res = {
        headers: { 'Content-Type': 'application/xml' },
        body: solrConfig,
    };
};