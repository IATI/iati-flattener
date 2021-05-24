module.exports = {
    addToIatiObject: (iatiObject, canonicalName, value) => {
        if (canonicalName in iatiObject && !(iatiObject[canonicalName] instanceof Array)) {
            iatiObject[canonicalName] = [iatiObject[canonicalName]];
            iatiObject[canonicalName].push(value);
        } else if (canonicalName in iatiObject && iatiObject[canonicalName] instanceof Array) {
            iatiObject[canonicalName].push(value);
        } else {
            iatiObject[canonicalName] = value;
        }

        return iatiObject;
    },

    buildIatiObject: (node, iatiObject = {}, parentCanonicalName = null) => {
        if (Object.prototype.hasOwnProperty.call(iatiObject, 'nodeName')) {
            let canonicalName = null;

            if (node.nodeName !== 'iati-activity') {
                canonicalName = module.exports.convertNameToCanonical(
                    node.nodeName,
                    parentCanonicalName
                );

                iatiObject = module.exports.addToIatiObject(
                    iatiObject,
                    canonicalName,
                    node.textContent
                );

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalRefName = module.exports.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    iatiObject = module.exports.addToIatiObject(
                        iatiObject,
                        canonicalRefName,
                        node.textContent
                    );
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                module.exports.buildIatiObject(node.childNodes[i], iatiObject, canonicalName);
            }
        }

        return iatiObject;
    },

    convertNameToCanonical: (nodeName, parentNodeCanonical = null) => {
        let retval = nodeName;

        if (parentNodeCanonical) {
            retval = `${parentNodeCanonical  }_${  retval}`;
        }
        retval = retval.replace(/-/g, '_');

        return retval;
    },

    getFlattenedObjectForActivityNode: (activity, dateCreated, version) => {
        let iatiObject = {};

        iatiObject.dataset_iati_version = version;
        iatiObject.dataset_last_updated = activity.getAttribute('last-updated-datetime');
        iatiObject.dataset_date_created = dateCreated;

        iatiObject = module.exports.buildIatiObject(activity, iatiObject);

        return iatiObject;
    },
};
// #Q Unclear as to what is supposed to be in the field types with the following suffixes

// 'reporting_org'
// 'reporting_org_xml'
// 'reporting_org_narrative_text' - when we've already got reporting org narrative
