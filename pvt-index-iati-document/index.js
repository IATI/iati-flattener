// const config = require('../config/config');
const libxml = require('libxmljs2');
const solr = require('solr-client');
const { client, getStartTime, getElapsedTime } = require('../config/appInsights');

module.exports = async (context, req) => {
    // context.log is equivalent to console.log in Azure Functions
    const startTime = getStartTime();

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

    let xmldoc;

    try {
        xmldoc = libxml.parseXml(body);
    } catch (error) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Body must be an xml string' },
        };

        return;
    }

    if (xmldoc) {
        console.log('Linting is a pita');
    }

    const solrOptions = {
        host: '127.0.0.1',
        port: '8983',
        core: 'dataset_shard1_replica_n1',
        path: '/solr', // should also begin with a slash
    };
    // Create a client
    const solrClient = solr.createClient(solrOptions);

    solrClient.autoCommit = true;

    const docs = [];
    for (let i = 0; i <= 2; i += 1) {
        const doc = {
            name: 'nonsense',
            title: 'nonsense',
            filetype: 'nonsense',
            date_created: '2021-01-01',
            date_updated: '2021-01-01',
            source_url: 'nonsense',
        };
        docs.push(doc);
    }

    // Add documents
    solrClient.add(docs, (err, obj) => {
        if (err) {
            console.log(err);
        } else {
            console.log(obj);
            solrClient.softCommit();
        }
    });

    const responseMessage = `Private API.`;

    const responseTime = getElapsedTime(startTime);

    // Send a specific metric in AppInsights Telemetry
    client.trackMetric({
        name: 'Message Creation - Success (s)',
        value: responseTime,
    });

    // Send a full Event in AppInsights - able to report/chart on this in AppInsights
    const eventSummary = {
        name: 'PVT Event Summary',
        properties: {
            messageTime: responseTime,
            responseMessage,
            query: '?',
        },
    };
    client.trackEvent(eventSummary);

    // Generating a response
    context.res = {
        status: 200 /* Defaults to 200 */,
        headers: { 'Content-Type': 'application/json' },
        body: responseMessage,
    };
};
