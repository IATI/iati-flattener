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

                let add = true;

                for (let i = 0; i < node.childNodes.length; i += 1) {
                    if (node.childNodes[i].constructor.name === 'Element') {
                        // xmldom includes the text of all child elements in textcontent,
                        // so believes parents of children with text have text themselves,
                        // and we don't want to add those parents, so:
                        add = false;
                    }
                }

                if (add) {
                    module.exports.addToIatiObject(canonicalName, node.textContent);
                }

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = module.exports.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    module.exports.addToIatiObject(canonicalAttName, att.nodeValue);
                }
                // As per the previous DS, each array of attribute values for an element
                // needs the same number of elements, regardless as to whether the attribute exists for that element,
                // and in the same order, hence the following rigmarole to add in empty strings
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
                        module.exports.addToIatiObject(existingAtt, '', true);
                    }
                }
            } else {
                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = module.exports.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    module.exports.addToIatiObject(canonicalAttName, att.nodeValue);
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                module.exports.buildIatiObject(node.childNodes[i], canonicalName, false);
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
