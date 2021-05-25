const { DOMParser } = require('xmldom');
const config = require('../config/config');
const activityIndexer = require('../solr/activity/indexer');
const { client, getStartTime, getElapsedTime } = require('../config/appInsights');

module.exports = async (context, req) => {
    // context.log is equivalent to console.log in Azure Functions
    const startTime = getStartTime();

    const name = req.query.name || (req.body && req.body.name);
    const responseMessage = `Private API.\nVersion ${config.VERSION}\n${
        name
            ? `Hello, ${name}. This HTTP triggered function executed successfully.`
            : 'This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.'
    }`;

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

    const flattenedActivities = [];
    activities = xmlDoc.getElementsByTagName('iati-activity');

    for (let i = 0; i < activities.length; i += 1) {
        const activity = activities[i];

        flattenedActivities[i] = await activityIndexer.getFlattenedObjectForActivityNode(
            activity,
            generated,
            version
        );
    }

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
            query: name,
        },
    };

    client.trackEvent(eventSummary);

    context.res = {
        status: 200 /* Defaults to 200 */,
        headers: { 'Content-Type': 'application/json' },
        body: flattenedActivities,
    };
};
