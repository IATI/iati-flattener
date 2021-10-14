# IATI Solr Functions

This Azure Function provides various services to allow us to index IATI documents to Solr, including a service to convert the IATI schema into a consistent Solr schema, and a service that when given a valid Activities document will return a json array of those activities flattened into json objects that can be added to Solr.

Both these services follow the convention of reducing Activity documents down to a single dimension of all elements and attributes which, by the IATI Schema, might contain a value - in the case of the Schema converter every possible value-holding element or attribute is represented, in the case of the Flattener, any element or attribute within the given IATI document that holds a value is represented.

The naming convention for both is to swap hyphens for underscores in tag names, and then join elements to both their children and to their attributes by an underscore. So,

    <parent att="val1">
        <child att="val2">
            Text Value
        </child>
    </parent>

Would be flattened to the following:

    {
        "parent_att": "val1",
        "parent_child": "Text Value",
        "parent_child_att": "val2"
    }

## Prerequisities

-   nvm - [nvm](https://github.com/nvm-sh/nvm) - Node version manager
-   Node LTS
    -   This will be the latest LTS version supported by Azure Functions, set in `.nvmrc`
    -   once you've installed nvm run `nvm use` which will look at `.nvmrc` for the node version, if it's not installed then it will prompt you to install it with `nvm install <version>`
-   [Azure Functions Core Tools v3](https://github.com/Azure/azure-functions-core-tools)
-   [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) version 2.4 or later.

## Getting Started

1. Create a new repository from the template
1. Follow instructions for nvm/node prerequisties above
1. Update package.json with application name, repository, etc.
1. Run `npm i`
1. Run `npm start` to run the function locally using the Azure Functions Core Tools

## Environment Variables

### Set Up

`cp .env.example .env`

### Description

APPINSIGHTS_INSTRUMENTATIONKEY=

-   Needs to be set for running locally, but will not actually report telemetry to the AppInsights instance in my experience

### Adding New

Add in:

1. .env.example
1. .env
1. `/config/config.js`

Import

```
const config = require("./config");

let myEnvVariable = config.ENV_VAR
```

## Attached Debugging (VSCode)

-   Set a breakpoint
-   Press F5 to start the Azure Function and Attach the VSCode debugger
    -   Configuration is contained in `.vscode/launch.json` and `.vscode/tasks.json`
-   Trigger a request that will hit your break point
-   Enojy!

## Linting and Code Formatting

### Prerequisities

-   To show linting inline install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VSCode

### Info

-   This is done with eslint following the airbnb-base style and using [Prettier](https://prettier.io). Implemented with [this](https://sourcelevel.io/blog/how-to-setup-eslint-and-prettier-on-node) guide.
-   If you use VSCode the formatting will happen automagically on save due to the `.vscode/settings.json` > `"editor.formatOnSave": true` setting

## Endpoints /api

### `POST /api/pvt/convert-schema`

Takes an IATI XML schema as the body, and returns a valid Solr schema rean Acivity core presenting to include all possible elements and attributes which may include a value, with their types converted from XSD to an appropriate Solr type.

### `POST /api/pvt/convert-schema-to-config`

Takes an IATI XML schema as the body, and returns a valid Solr `solrconfig.xml`. Currently used to modify the default `fl` query parameter to output only iati elements (in iati order) by default.

### `POST /api/pvt/flatten/activities`

Takes a valid iati-activities XML document as the body and returns a json array of those activities flattened into json objects that can be added to the Solr Activity core, as defined by converting the IATI XML schema using the `POST /api/pvt/convert-schema` route.

## Updating Solr Configset

See https://github.com/IATI/datastore-solr-configs

## Creating a new route

`func new --name <routename> --template "HTTP trigger" --authlevel "anonymous"`

## AppInsights SDK

-   An example of using the `config/appInsights.js` utility is available in the `pvt-get/index.js` where execution time of the function is measured and then logged in 2 ways to the AppInsights Telemetry.

## Filesystem

-   Provided in `config/fileSystem.js` which can be imported to get the promisified versions of common `fs` functions since we're stuck with Node v12 for now (these are standard in Node v14)

## Integration Tests

### Running

-   Install newman globally `npm i -g newman`
-   Start function `npm start`
-   Run Tests `npm test`

### Modifying/Adding

Integration tests are written in Postman v2.1 format and run with newman
Import the `integrations-tests/azure-function-node-microservice-template.postman_collection.json` into Postman and write additional tests there

## Deployment

-   Update relevant items in `.github/workflows/develop-func-deploy.yml` (see comments inline)
-   Create a [Service Principal](https://github.com/IATI/IATI-Internal-Wiki/blob/main/IATI-Unified-Infra/ServicePrincipals.md) and set the DEV_AZURE_CREDENTIALS GitHub Secret
