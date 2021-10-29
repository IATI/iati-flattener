class ActivityFlattener {
    constructor() {
        this.iatiMap = {};
        this.iatiObject = {};
    }

    async addToIatiObject(canonicalName, value, allowEmpty = false) {
        value = value.trim();

        if (!allowEmpty) {
            if (value === '') {
                return;
            }
        }

        if (
            ['iso_date', 'value_date', 'extraction_date', '_datetime'].some((dateVal) =>
                canonicalName.includes(dateVal)
            )
        ) {
            try {
                value = new Date(value).toISOString();
            } catch (error) {
                console.error(
                    `Could not convert date for field: ${canonicalName}, value: ${value}. Error: ${error}`
                );
                throw new Error(
                    `Could not convert date for field: ${canonicalName}, value: ${value}. Error: ${error}`
                );
            }
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

    async mapIatiObject(node, parentCanonicalName = null) {
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
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                await this.mapIatiObject(node.childNodes[i], canonicalName);
            }
        }
    }

    async buildIatiObject(node, parentCanonicalName = null, map = true) {
        if (map) {
            await this.mapIatiObject(node);
        }

        if (Object.prototype.hasOwnProperty.call(node, 'nodeName')) {
            let canonicalName = null;

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
                    this.addToIatiObject(canonicalName, node.textContent);
                }

                for (let i = 0; i < node.attributes.length; i += 1) {
                    const att = node.attributes[i];

                    const canonicalAttName = ActivityFlattener.convertNameToCanonical(
                        att.nodeName,
                        canonicalName
                    );

                    this.addToIatiObject(canonicalAttName, att.nodeValue);
                }
                // As per the previous DS, each array of attribute values for an element
                // needs the same number of elements, regardless as to whether the attribute exists for that element,
                // and in the same order, hence the following rigmarole to add in empty strings
                const attributes = [];

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

                    this.addToIatiObject(canonicalAttName, att.nodeValue);
                }
            }

            for (let i = 0; i < node.childNodes.length; i += 1) {
                this.buildIatiObject(node.childNodes[i], canonicalName, false);
            }
        }
    }

    static convertNameToCanonical(nodeName, parentNodeCanonical = null) {
        let retval = nodeName;

        if (parentNodeCanonical) {
            retval = `${parentNodeCanonical}_${retval}`;
        }
        retval = retval.replace(/-/g, '_');

        return retval;
    }

    async getFlattenedObjectForActivityNode(
        activity,
        { generatedDatetime, version, linkedDataDefault }
    ) {
        // required
        this.iatiObject.dataset_version = version;

        // not required
        if (linkedDataDefault) {
            this.iatiObject.dataset_linked_data_default = linkedDataDefault;
        }

        if (generatedDatetime) {
            this.iatiObject.dataset_generated_datetime = new Date(generatedDatetime).toISOString();
        }

        await this.buildIatiObject(activity);

        const retval = this.iatiObject;

        this.iatiObject = {};

        return retval;
    }
}

module.exports = { ActivityFlattener };
