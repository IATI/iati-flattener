class ActivityFlattener {
    constructor() {
        this.iatiMap = {};
        this.iatiMapAdded = {};
        this.iatiObject = {};
    }

    addToIatiObject(canonicalName, origValue, allowEmpty = false) {
        let value = origValue.trim();

        if (!allowEmpty) {
            if (value === '') {
                return;
            }
        }

        // clean iati_identifier so hash matches lakifier
        if (canonicalName === 'iati_identifier') {
            value = value.replace(/\n/g, '').replace(/\r/g, '');
        }

        if (
            ['iso_date', 'value_date', 'extraction_date', '_datetime'].some((dateVal) =>
                canonicalName.includes(dateVal)
            )
        ) {
            try {
                if (value === '') {
                    value = '1970-01-01T00:00:00.000Z';
                } else {
                    value = new Date(value).toISOString();
                }
            } catch (error) {
                console.error(
                    `Could not convert date for field: ${canonicalName}, value: ${value}. Error: ${error}`
                );
                throw new Error(
                    `Could not convert date for field: ${canonicalName}, value: ${value}. Error: ${error}`
                );
            }
        }

        // handle empty numbers values for multivalued fields
        if (
            value === '' &&
            [
                'sector_percentage',
                'recipient_country_percentage',
                'recipient_region_percentage',
                'country_budget_items_budget_item_percentage',
                'fss_forecast_year',
            ].includes(canonicalName)
        ) {
            value = 'NaN';
        }

        if (
            canonicalName in this.iatiObject &&
            !(this.iatiObject[canonicalName] instanceof Array)
        ) {
            this.iatiObject[canonicalName] = [this.iatiObject[canonicalName]];
            this.iatiObject[canonicalName].push(value);
        } else if (
            canonicalName in this.iatiObject &&
            this.iatiObject[canonicalName] instanceof Array
        ) {
            this.iatiObject[canonicalName].push(value);
        } else {
            this.iatiObject[canonicalName] = value;
        }
    }

    mapIatiObject(node, parentCanonicalName = null) {
        if (Object.prototype.hasOwnProperty.call(node, 'nodeName')) {
            let canonicalName = null;

            if (node.nodeName !== 'iati-activity') {
                canonicalName = ActivityFlattener.convertNameToCanonical(
                    node.nodeName,
                    parentCanonicalName
                );

                if (!(canonicalName in this.iatiMap)) {
                    this.iatiMap[canonicalName] = [];
                }

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = ActivityFlattener.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    if (!this.iatiMap[canonicalName].includes(canonicalAttName)) {
                        this.iatiMap[canonicalName].push(canonicalAttName);
                    }
                }

                let add = true;

                for (let i = 0; i < node.childNodes.length; i += 1) {
                    if (node.childNodes[i].constructor.name === 'Element') {
                        add = false;
                    }
                }

                if (add) {
                    this.iatiMapAdded[canonicalName] = true;
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                this.mapIatiObject(node.childNodes[i], canonicalName);
            }
        }
    }

    buildIatiObject(node, parentCanonicalName = null, map = true) {
        if (map) {
            this.mapIatiObject(node);
        }

        if (Object.prototype.hasOwnProperty.call(node, 'nodeName')) {
            let canonicalName = null;
            const attributes = [];
            const childrenNodes = [];

            if (node.nodeName !== 'iati-activity') {
                canonicalName = ActivityFlattener.convertNameToCanonical(
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
                    this.addToIatiObject(
                        canonicalName,
                        node.textContent,
                        canonicalName.endsWith('_narrative')
                    );
                }

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = ActivityFlattener.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    this.addToIatiObject(canonicalAttName, att.nodeValue, true);
                }
                // As per the previous DS, each array of attribute values for an element
                // needs the same number of elements, regardless as to whether the attribute exists for that element,
                // and in the same order, hence the following rigmarole to add in empty strings
                for (let n = 0; n < node.attributes.length; n += 1) {
                    const canonicalAttName = ActivityFlattener.convertNameToCanonical(
                        node.attributes[n].nodeName,
                        canonicalName
                    );

                    attributes.push(canonicalAttName);
                }

                for (let i = 0; i < this.iatiMap[canonicalName].length; i += 1) {
                    const existingAtt = this.iatiMap[canonicalName][i];
                    if (!attributes.includes(existingAtt)) {
                        this.addToIatiObject(existingAtt, '', true);
                    }
                }
            } else {
                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = ActivityFlattener.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );
                    attributes.push(canonicalAttName);

                    this.addToIatiObject(canonicalAttName, att.nodeValue);
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                this.buildIatiObject(node.childNodes[i], canonicalName, false);
                childrenNodes.push(
                    ActivityFlattener.convertNameToCanonical(
                        node.childNodes[i].nodeName,
                        canonicalName
                    )
                );
            }
            // Also allow the adding of blank elements where needed to preserve explosion alignment
            for (let i = 0; i < Object.keys(this.iatiMapAdded).length; i += 1) {
                const missingKey = Object.keys(this.iatiMapAdded)[i];
                const related = missingKey.startsWith(`${canonicalName}_`);
                const attributeIsMissing = !attributes.includes(missingKey);
                let hasACloserRelative = false;
                if (related) {
                    for (let j = 0; j < childrenNodes.length; j += 1) {
                        const childName = childrenNodes[j];
                        const childRelated = missingKey.startsWith(childName);
                        if (childRelated) {
                            hasACloserRelative = true;
                        }
                    }
                }
                if (related && !hasACloserRelative && attributeIsMissing) {
                    this.addToIatiObject(missingKey, '', true);
                }
            }
        }
    }

    static convertNameToCanonical(nodeName, parentNodeCanonical = null) {
        let retval = nodeName;

        if (parentNodeCanonical) {
            retval = `${parentNodeCanonical}_${retval}`;
        }
        retval = retval.replace(/-/g, '_');
        retval = retval.replace(/:/g, '_');

        return retval;
    }

    getFlattenedObjectForActivityNode(activity, { generatedDatetime, version, linkedDataDefault }) {
        // required
        this.iatiObject.dataset_version = version;

        // not required
        if (linkedDataDefault) {
            this.iatiObject.dataset_linked_data_default = linkedDataDefault;
        }

        if (generatedDatetime) {
            this.iatiObject.dataset_generated_datetime = new Date(generatedDatetime).toISOString();
        }

        this.buildIatiObject(activity);

        const retval = this.iatiObject;

        this.iatiObject = {};

        return retval;
    }
}

export default ActivityFlattener;
