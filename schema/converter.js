const fs = require('fs');

module.exports = {
    solrSchemaObjects: [],
    iatiXsdTypes: [],
    iatiXsdComplexTypes: [],
    iatiXsdAttributes: [],

    convertXsdTypeToSolr: async (xsdType) => {
        switch (xsdType) {
            case 'textRequiredType':
                return 'text_general';
            case 'xsd:boolean':
                return 'boolean';
            case 'xsd:nonNegativeInteger':
            case 'xsd:int':
            case 'xsd:positiveInteger':
                return 'pint';
            case 'xsd:date':
            case 'xsd:dateTime':
                return 'pdate';
            case 'currencyType':
            case 'xsd:decimal':
                return 'pdoubles';
            case 'xsd:NMTOKEN':
            case 'documentLinkResultBase':
            case 'resultLocationBase':
            case 'documentLinkBase':
            case 'aidTypeBase':
            case 'xsd:string':
            case 'xsd:anyURI':
            default:
                return 'string';
        }
    },

    buildAttributeFromElement: async (element) => {
        let attribute = { name: null, type: null };

        if (!Object.prototype.hasOwnProperty.call(element, 'attributes')) {
            return;
        }

        for (let i = 0; i < element.attributes.length; i += 1) {
            switch (element.attributes[i].name) {
                case 'name':
                case 'ref':
                    attribute['name'] = element.attributes[i].value;
                    break;
                case 'type':
                    attribute['type'] = await module.exports.convertXsdTypeToSolr(
                        element.attributes[i].value
                    );
                    break;
                default:
                    break;
            }
        }

        if (attribute.name === null || attribute.type === null) {
            return;
        }

        let add = true;

        for (let i = 0; i < module.exports.iatiXsdAttributes.length; i += 1) {
            if (attribute.name === module.exports.iatiXsdAttributes[i].name) {
                add = false;
                break;
            }
        }

        if (add) {
            module.exports.iatiXsdAttributes.push(attribute);
        }
    },

    buildComplexTypeFromElement: async (element) => {
        let complexType = {};

        if (!Object.prototype.hasOwnProperty.call(element, 'attributes')) {
            return;
        }

        for (let i = 0; i < element.attributes.length; i += 1) {
            if (element.attributes[i].name !== 'name') {
                continue;
            }

            complexType['name'] = element.attributes[i].value;
            complexType['attributes'] = [];

            const attributes = element.getElementsByTagName('xsd:attribute');

            for (let n = 0; n < attributes.length; n += 1) {
                for (let x = 0; x < attributes[n].attributes.length; x += 1) {
                    let type = null;

                    switch (attributes[n].attributes[x].name) {
                        case 'name':
                        case 'ref':
                            for (let y = 0; y < module.exports.iatiXsdAttributes.length; y += 1) {
                                if (
                                    module.exports.iatiXsdAttributes[y].name ===
                                    attributes[n].attributes[x].value
                                ) {
                                    type = module.exports.iatiXsdAttributes[y].type;
                                }
                            }

                            complexType['attributes'].push({
                                name: attributes[n].attributes[x].value,
                                type: type,
                            });
                            break;
                        default:
                            break;
                    }
                }
            }

            module.exports.iatiXsdComplexTypes.push(complexType);
        }
    },

    buildSolrSchemaFromIatiElement: async (element, parentCanonicalName = null) => {
        const solrElement = {};

        solrElement.canonicalName = parentCanonicalName;
        solrElement.type = null;
        solrElement.required = false;
        solrElement.multiValued = true;

        let addElement = false;

        if (Object.prototype.hasOwnProperty.call(element, 'attributes')) {
            for (let i = 0; i < element.attributes.length; i += 1) {
                switch (element.attributes[i].name) {
                    case 'name':
                        if (
                            element.attributes[i].nodeValue !== 'iati-activities' &&
                            element.attributes[i].nodeValue !== 'iati-activity'
                        ) {
                            solrElement.canonicalName = await module.exports.convertNameToCanonical(
                                element.attributes[i].nodeValue,
                                parentCanonicalName
                            );
                            addElement = true;
                        }
                        break;
                    case 'ref':
                        if (
                            element.attributes[i].nodeValue !== 'iati-activities' &&
                            element.attributes[i].nodeValue !== 'iati-activity'
                        ) {
                            solrElement.canonicalName = await module.exports.convertNameToCanonical(
                                element.attributes[i].nodeValue,
                                parentCanonicalName
                            );

                            if (element.attributes[i].nodeValue === 'narrative') {
                                solrElement.type = 'iati_narrative';
                            } else {
                                for (
                                    let n = 0;
                                    n < module.exports.iatiXsdAttributes.length;
                                    n += 1
                                ) {
                                    if (
                                        module.exports.iatiXsdAttributes[n].name ===
                                        element.attributes[i].nodeValue
                                    ) {
                                        solrElement.type = module.exports.iatiXsdAttributes[n].type;
                                    }
                                }

                                solrElement.type = await module.exports.convertXsdTypeToSolr(
                                    element.attributes[i].nodeValue
                                );
                            }

                            addElement = true;
                        }
                        break;

                    case 'type':
                        if (
                            !module.exports.iatiXsdTypes.includes(element.attributes[i].nodeValue)
                        ) {
                            module.exports.iatiXsdTypes.push(element.attributes[i].nodeValue);
                        }

                        for (let n = 0; n < module.exports.iatiXsdComplexTypes.length; n += 1) {
                            if (
                                module.exports.iatiXsdComplexTypes[n].name ===
                                element.attributes[i].nodeValue
                            ) {
                                let complexType = module.exports.iatiXsdComplexTypes[n];

                                for (let x = 0; x < complexType.attributes.length; x += 1) {
                                    let ctSolrElement = {};

                                    ctSolrElement.canonicalName =
                                        await module.exports.convertNameToCanonical(
                                            complexType.attributes[x].name,
                                            solrElement.canonicalName
                                        );

                                    for (
                                        let y = 0;
                                        y < module.exports.iatiXsdAttributes.length;
                                        y += 1
                                    ) {
                                        if (
                                            module.exports.iatiXsdAttributes[y].name ===
                                            complexType.attributes[x].name
                                        ) {
                                            ctSolrElement.type =
                                                module.exports.iatiXsdAttributes[y].type;
                                        }
                                    }

                                    ctSolrElement.type = complexType.attributes[x].type;

                                    if (
                                        ctSolrElement.type !== null &&
                                        !module.exports.hasElementWithCanonicalName(
                                            ctSolrElement.canonicalName
                                        )
                                    ) {
                                        module.exports.solrSchemaObjects.push(ctSolrElement);
                                    }
                                }
                            }
                        }

                        solrElement.type = await module.exports.convertXsdTypeToSolr(
                            element.attributes[i].nodeValue
                        );
                        break;

                    case 'maxOccurs':
                        if (element.attributes[i].nodeValue === '1') {
                            solrElement.multiValued = false;
                        }

                        break;
                    default:
                        break;
                }
            }
        }

        if (addElement) {
            if (
                solrElement.type !== null &&
                !module.exports.hasElementWithCanonicalName(solrElement.canonicalName)
            ) {
                module.exports.solrSchemaObjects.push(solrElement);
            }
        }

        if (Object.prototype.hasOwnProperty.call(element, 'attributes')) {
            for (let i = 0; i < element.childNodes.length; i += 1) {
                await module.exports.buildSolrSchemaFromIatiElement(
                    element.childNodes[i],
                    solrElement.canonicalName
                );
            }
        }
    },

    hasElementWithCanonicalName: (canonicalName) => {
        for (let i = 0; i < module.exports.solrSchemaObjects.length; i += 1) {
            if (module.exports.solrSchemaObjects[i].canonicalName === canonicalName) {
                return true;
            }
        }

        return false;
    },

    convertNameToCanonical: (nodeName, parentNodeCanonical = null) => {
        let retval = nodeName;

        if (parentNodeCanonical) {
            retval = `${parentNodeCanonical}_${retval}`;
        }
        retval = retval.replace(/-/g, '_');

        return retval;
    },

    setToDefaultElements: async () => {
        module.exports.solrSchemaObjects = [
            {
                canonicalName: 'iati_activities_document_hash',
                type: 'string',
                required: true,
                multiValued: false,
            },
            {
                canonicalName: 'dataset_iati_version',
                type: 'string',
                required: false,
                multiValued: false,
            },
            {
                canonicalName: 'dataset_date_created',
                type: 'pdate',
                required: false,
                multiValued: false,
            },
            {
                canonicalName: 'dataset_date_updated',
                type: 'pdate',
                required: false,
                multiValued: false,
            },
        ];
    },

    buildSolrSchemaXML: async () => {
        let xmlString = '';

        for (let i = 0; i < module.exports.solrSchemaObjects.length; i += 1) {
            const name = module.exports.solrSchemaObjects[i].canonicalName;
            const { type } = module.exports.solrSchemaObjects[i];
            const { required } = module.exports.solrSchemaObjects[i];
            const { multiValued } = module.exports.solrSchemaObjects[i];
            xmlString += `<field name="${name}" type="${type}" multiValued="${multiValued}" indexed="true" required="${required}" stored="true"/>\n`;
        }

        let tpl;
        let schema = null;

        fs.readFile(`${__dirname}/solr_template.xml`, (error, data) => {
            if (error) {
                throw error;
            }
            tpl = data.toString();

            schema = tpl.replace('#ACTIVITY_CORE#', xmlString);
        });

        while (schema === null) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        return schema;
    },

    buildSolrConfigXML: async () => {
        let xmlString = '';

        const fieldString = module.exports.solrSchemaObjects.map((obj) => obj.canonicalName).join();

        xmlString = `<str name="fl">${fieldString}</str>`;

        let tpl;
        let solrconfig = null;

        fs.readFile(`${__dirname}/solrconfig_template.xml`, (error, data) => {
            if (error) {
                throw error;
            }
            tpl = data.toString();

            solrconfig = tpl.replace('#ADDITIONAL_DEFAULTS#', xmlString);
        });

        while (solrconfig === null) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        return solrconfig;
    },

    getSolrSchemaFromIatiSchema: async (iatiSchema) => {
        const iatiXsdAttributes = iatiSchema.getElementsByTagName('xsd:attribute');

        for (let i = 0; i < iatiXsdAttributes.length; i += 1) {
            await module.exports.buildAttributeFromElement(iatiXsdAttributes[i]);
        }

        const iatiXsdComplexTypes = iatiSchema.getElementsByTagName('xsd:complexType');

        for (let i = 0; i < iatiXsdComplexTypes.length; i += 1) {
            await module.exports.buildComplexTypeFromElement(iatiXsdComplexTypes[i]);
        }

        const elements = iatiSchema.getElementsByTagName('xsd:element');

        module.exports.setToDefaultElements();

        for (let i = 0; i < elements.length; i += 1) {
            await module.exports.buildSolrSchemaFromIatiElement(elements[i]);
        }

        const schema = await module.exports.buildSolrSchemaXML();

        return schema;
    },

    getSolrConfigFromIatiSchema: async (iatiSchema) => {
        const elements = iatiSchema.getElementsByTagName('xsd:element');

        module.exports.setToDefaultElements();

        for (let i = 0; i < elements.length; i += 1) {
            await module.exports.buildSolrSchemaFromIatiElement(elements[i]);
        }

        const solrConfig = await module.exports.buildSolrConfigXML();

        return solrConfig;
    },
};
