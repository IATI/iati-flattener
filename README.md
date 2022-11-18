[![Deploy_To_Dev_Function_On_Push](https://github.com/IATI/iati-flattener/actions/workflows/develop-func-deploy.yml/badge.svg)](https://github.com/IATI/iati-flattener/actions/workflows/develop-func-deploy.yml)

# IATI Flattener

This Azure Function provides a service to allow us to index IATI documents to Solr. When given a valid Activities document will return a json array of those activities flattened into json objects that can be added to Solr.

This service follows the convention of reducing Activity documents down to a single dimension of all elements and attributes which, by the IATI Schema, might contain a value, in the case of the Flattener, any element or attribute within the given IATI document that holds a value is represented.

The naming convention for both is to swap hyphens for underscores in tag names, and then join elements to both their children and to their attributes by an underscore. So,

```xml
<iati-activities version="2.03">
    <iati-activity att="val1">
        <parent att="val2">
            <child att="val3">
                Text Value
            </child>
        </parent>
    </iati-activity>
</iati-activities>
```

Would be flattened to the following:

```json
[
    {
        "dataset_version": "2.03",
        "att": "val1",
        "parent_att": "val2",
        "parent_child": "Text Value",
        "parent_child_att": "val3"
    }
]
```

## Endpoints

See OpenAPI specification `postman/schemas/index.yaml`. To view locally in Swagger UI, you can use the `42crunch.vscode-openapi` VSCode extension.

## Prerequisities

-   nvm - [nvm](https://github.com/nvm-sh/nvm) - Node version manager
-   Node LTS
    -   This will be the latest LTS version supported by Azure Functions, set in `.nvmrc`
    -   once you've installed nvm run `nvm use` which will look at `.nvmrc` for the node version, if it's not installed then it will prompt you to install it with `nvm install <version>`
-   [Azure Functions Core Tools v3](https://github.com/Azure/azure-functions-core-tools)
-   [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) version 2.4 or later.

## Getting Started

1. Run `npm i`
1. Run `npm start` to run the function locally using the Azure Functions Core Tools

## Environment Variables

### Set Up

`cp .env.example .env`

### Description

APPLICATIONINSIGHTS_CONNECTION_STRING=

-   Needs to be set for running locally, but will not actually report telemetry to the AppInsights instance in my experience

### Adding New

Add in:

1. .env.example
1. .env
1. `/config/config.js`

Import

```
import config from "./config.js";

let myEnvVariable = config.ENV_VAR
```

## Attached Debugging (VSCode)

-   Set a breakpoint
-   Press F5 to start the Azure Function and Attach the VSCode debugger
    -   Configuration is contained in `.vscode/launch.json` and `.vscode/tasks.json`
-   Trigger a request that will hit your break point
-   Enjoy!

## Linting and Code Formatting

### Prerequisities

-   To show linting inline install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VSCode

### Info

-   This is done with eslint following the airbnb-base style and using [Prettier](https://prettier.io). Implemented with [this](https://sourcelevel.io/blog/how-to-setup-eslint-and-prettier-on-node) guide.
-   If you use VSCode the formatting will happen automagically on save due to the `.vscode/settings.json` > `"editor.formatOnSave": true` setting

## Creating a new route

`func new --name <routename> --template "HTTP trigger" --authlevel "anonymous"`

## Integration Tests

### Running

-   Install newman globally `npm i -g newman`
-   Start function `npm start`
-   Run Tests `npm test`

### Modifying/Adding

Integration tests are written in Postman v2.1 format and run with newman
Import the `integration-tests/iati-flattener-integration-tests.postman_collection.json` into Postman and write additional tests there
