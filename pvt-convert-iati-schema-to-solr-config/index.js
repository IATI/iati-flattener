const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const multipart = require('multipart-formdata');
const schemaConverter = require('../schema/converter');

module.exports = async (context, req) => {
    const { body } = req;

    // No body
    if (!body) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'No body' },
        };

        return;
    }

    // Not a Buffer
    if (!Buffer.isBuffer(body)) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Body must be a multipart form of application/xml files' },
        };

        return;
    }

    // encode body to base64 string
    const bodyBuffer = Buffer.from(body);

    const boundary = multipart.getBoundary(req.headers['content-type']);
    // parse the body
    const files = multipart.parse(bodyBuffer, boundary);

    // Body should be form-data of application/xml files
    if (!files.every((file) => file.type === 'application/xml')) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Body must be a multipart form of application/xml files' },
        };

        return;
    }

    // There should be at least one 'main' file
    if (!files.some((file) => file.name === 'main')) {
        context.res = {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'There should be one file with a key of "main"' },
        };

        return;
    }

    // Handle single "main" file case

    const commonXMLString = files.find((file) => file.name === 'common').data.toString();
    const mainXMLString = files.find((file) => file.name === 'main').data.toString();
    if (!commonXMLString) {
        context.log(`No "common" found, using "main" as body only`);
        const xmlDoc = new DOMParser().parseFromString(mainXMLString);

        const solrConfig = await schemaConverter.getSolrConfigFromIatiSchema(xmlDoc);

        context.res = {
            headers: { 'Content-Type': 'application/xml' },
            body: solrConfig,
        };
        return;
    }

    const commonFileName = files.find((file) => file.name === 'common').filename;
    if (!mainXMLString.includes(`<xsd:include schemaLocation="${commonFileName}"/>`)) {
        context.log(
            `"main" file does not contain an xsd:include of "common", using "main" as body`
        );
        const xmlDoc = new DOMParser().parseFromString(mainXMLString);

        const solrConfig = await schemaConverter.getSolrConfigFromIatiSchema(xmlDoc);

        context.res = {
            headers: { 'Content-Type': 'application/xml' },
            body: solrConfig,
        };
        return;
    }

    // Merge common schema into main
    const commonXMLDoc = new DOMParser().parseFromString(commonXMLString);

    const xsdSchemaText = new XMLSerializer().serializeToString(
        commonXMLDoc.getElementsByTagName('xsd:schema')[0]
    );

    const trimmed = xsdSchemaText.replace(/^<\/?xsd:schema.*>$/gm, '');

    const bodyToConvert = mainXMLString.replace(
        `<xsd:include schemaLocation="${commonFileName}"/>`,
        trimmed
    );

    const compiledDoc = new DOMParser().parseFromString(bodyToConvert);
    const mainDoc = new DOMParser().parseFromString(mainXMLString);

    const solrConfig = await schemaConverter.getSolrConfigFromIatiSchema(compiledDoc, mainDoc);

    context.res = {
        headers: { 'Content-Type': 'application/xml' },
        body: solrConfig,
    };
    
};
