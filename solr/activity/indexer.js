module.exports = {
    iatiMap: {},
    iatiObject: {},

    addToIatiObject: async (canonicalName, value, allowEmpty = false) => {
        value = value.trim();

        if (!allowEmpty) {
            if (value === '') {
                return;
            }
        }

        if (
            canonicalName in module.exports.iatiObject &&
            !(module.exports.iatiObject[canonicalName] instanceof Array)
        ) {
            module.exports.iatiObject[canonicalName] = [module.exports.iatiObject[canonicalName]];
            module.exports.iatiObject[canonicalName].push(value);
        } else if (
            canonicalName in module.exports.iatiObject &&
            module.exports.iatiObject[canonicalName] instanceof Array
        ) {
            module.exports.iatiObject[canonicalName].push(value);
        } else {
            module.exports.iatiObject[canonicalName] = value;
        }
    },

    mapIatiObject: async (node, parentCanonicalName = null) => {
        if (Object.prototype.hasOwnProperty.call(node, 'nodeName')) {
            let canonicalName = null;

            if (node.nodeName !== 'iati-activity') {
                canonicalName = module.exports.convertNameToCanonical(
                    node.nodeName,
                    parentCanonicalName
                );

                if (!(canonicalName in module.exports.iatiMap)) {
                    module.exports.iatiMap[canonicalName] = [];
                }

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = module.exports.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    if (!module.exports.iatiMap[canonicalName].includes(canonicalAttName)) {
                        module.exports.iatiMap[canonicalName].push(canonicalAttName);
                    }
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                await module.exports.mapIatiObject(node.childNodes[i], canonicalName);
            }
        }
    },

    buildIatiObject: async (node, parentCanonicalName = null, map = true) => {
        if (map) {
            await module.exports.mapIatiObject(node);
        }

        if (Object.prototype.hasOwnProperty.call(node, 'nodeName')) {
            let canonicalName = null;

            if (node.nodeName !== 'iati-activity') {
                canonicalName = module.exports.convertNameToCanonical(
                    node.nodeName,
                    parentCanonicalName
                );

                await module.exports.addToIatiObject(canonicalName, node.textContent);

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = module.exports.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    await module.exports.addToIatiObject(canonicalAttName, node.textContent);
                }
                // As per the previous DS, each array of attribute values needs the same number of elements,
                // hence this rigmarole to add in empty strings
                const attributes = [];

                for (let n = 0; n < node.attributes.length; n += 1) {
                    const canonicalAttName = module.exports.convertNameToCanonical(
                        node.attributes[n].nodeName,
                        canonicalName
                    );

                    attributes.push(canonicalAttName);
                }

                for (let i = 0; i < module.exports.iatiMap[canonicalName].length; i += 1) {
                    const existingAtt = module.exports.iatiMap[canonicalName][i];
                    if (!attributes.includes(existingAtt)) {
                        await module.exports.addToIatiObject(existingAtt, '', true);
                    }
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                await module.exports.buildIatiObject(node.childNodes[i], canonicalName, false);
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

    getFlattenedObjectForActivityNode: async (activity, dateCreated, version) => {
        module.exports.iatiObject.dataset_iati_version = version;
        module.exports.iatiObject.dataset_last_updated =
            activity.getAttribute('last-updated-datetime');
        module.exports.iatiObject.dataset_date_created = dateCreated;

        await module.exports.buildIatiObject(activity);

        const retval = module.exports.iatiObject;

        module.exports.iatiObject = {};

        return retval;
    },
};
// #Q Unclear as to what is supposed to be in the field types with the following suffixes

// 'reporting_org'
// 'reporting_org_xml'
// 'reporting_org_narrative_text' - when we've already got reporting org narrative
