import { DOMParser } from '@xmldom/xmldom';
import ActivityFlattener from '../services/activity/flattener.js';
import { client, getStartTime, getElapsedTime } from '../config/appInsights.js';

export default async function pvtFlattenIatiDocument(context, req) {
    // context.log is equivalent to console.log in Azure Functions
    const startTime = getStartTime();

    let { body } = req;

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
    // Replace vertical tab, formfeed, nextline, line separator, paragraph separator with plain new line

    // eslint-disable-next-line no-control-regex
    const invalidCharRegex = /[\x0B\x0C\u0085\u2028\u2029]+/gi;

    if (invalidCharRegex.test(body)) {
        client.trackTrace({ message: 'Invalid Character found and replaced' });
        body = body.replace(invalidCharRegex, '\n');
    }

    let xmlDoc = new DOMParser().parseFromString(body);

    let activities = xmlDoc.getElementsByTagName('iati-activities')[0];

    if (!activities) {
        context.res = {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'No iati-activities element found - is this an organisations doc?' },
        };
        return;
    }

    const version = activities.getAttribute('version');
    const generatedDatetime = activities.getAttribute('generated-datetime');
    const linkedDataDefault = activities.getAttribute('linked-data-default');

    const flattenedActivities = [];
    activities = xmlDoc.getElementsByTagName('iati-activity');

    for (let i = 0; i < activities.length; i += 1) {
        const activity = activities[i];
        const activityFlattener = new ActivityFlattener();

        flattenedActivities[i] = activityFlattener.getFlattenedObjectForActivityNode(activity, {
            generatedDatetime,
            version,
            linkedDataDefault,
        });
    }
    xmlDoc = null;

    const responseTime = getElapsedTime(startTime);

    // Send a specific metric in AppInsights Telemetry
    client.trackMetric({
        name: 'Document Flattened - Success (s)',
        value: responseTime,
    });

    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: flattenedActivities,
    };
}
