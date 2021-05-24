// const config = require('../config/config');
const { DOMParser } = require('xmldom');
const solr = require('solr-client');
const activityIndexer = require('../solr/activity/indexer');
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

    const xmlDoc = new DOMParser().parseFromString(body);

    let activities = xmlDoc.getElementsByTagName('iati-activities')[0];

    const version = activities.getAttribute('version');
    const generated = activities.getAttribute('generated-datetime');

    activities = xmlDoc.getElementsByTagName('iati-activity');

    const activitySolrDocs = [];

    for (let i = 0; i < activities.length; i += 1) {
        const activity = activities[i];

        activitySolrDocs[i] = activityIndexer.getFlattenedObjectForActivityNode(
            activity,
            generated,
            version
        );

        console.log(activity.nodeName);
    }

    const solrOptions = {
        host: '127.0.0.1',
        port: '8983',
        core: 'activity_shard1_replica_n1',
        path: '/solr',
    };
    // Create a client
    const activitySolrClient = solr.createClient(solrOptions);

    // Add documents
    activitySolrClient.add(activitySolrDocs, (err, obj) => {
        if (err) {
            console.log(err);
        } else {
            console.log(obj);
            activitySolrClient.softCommit();
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
