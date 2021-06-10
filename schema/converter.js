module.exports = {
    solrSchemaObjects: [],
    iatiXsdTypes: [],

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

    buildSolrSchemaFromIatiElement: async (element, parentCanonicalName = null) => {
        const solrElement = {};

        solrElement.canonicalName = parentCanonicalName;
        solrElement.type = null;
        solrElement.required = false;

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
                                solrElement.type = 'iati-narrative';
                            } else {
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
                        solrElement.type = await module.exports.convertXsdTypeToSolr(
                            element.attributes[i].nodeValue
                        );
                        break;
                    default:
                        break;
                }
            }
        }

        if (addElement) {
            if (
                solrElement.type !== null &&
                !module.exports.solrSchemaObjects.includes(solrElement)
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
                canonicalName: 'dataset_iati_version',
                type: 'string',
                required: true,
            },
            {
                canonicalName: 'dataset_date_created',
                type: 'pdate',
                required: true,
            },
            {
                canonicalName: 'dataset_date_updated',
                type: 'pdate',
                required: true,
            },
        ];
    },

    buildSolrSchemaXML: async () => {
        let xmlString = '';

        for (let i = 0; i < module.exports.solrSchemaObjects.length; i += 1) {
            const name = module.exports.solrSchemaObjects[i].canonicalName;
            const {type} = module.exports.solrSchemaObjects[i];
            const {required} = module.exports.solrSchemaObjects[i];
            xmlString +=
                `<field name="${name}" type="${type}" multiValued="true" indexed="true" required="${required}" stored="true"/>\n`;
        }

        return xmlString;
    },

    getSolrSchemaFromIatiSchema: async (iatiSchema) => {
        const elements = iatiSchema.getElementsByTagName('xsd:element');

        module.exports.setToDefaultElements();

        for (let i = 0; i < elements.length; i += 1) {
            await module.exports.buildSolrSchemaFromIatiElement(elements[i]);
        }

        return module.exports.buildSolrSchemaXML();
    },
};
