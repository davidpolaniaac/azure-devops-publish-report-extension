---
title: Publish Report extension
tags: devops
keywords: html
summary: publish html reports on azure devops
---
Configure the extension to display html reports (report of tasks) on the Azure DevOps, from the pipeline. Collect report details from pipeline based on the URL.

This project uses Webpack to package the extension as an executable js file with dependencies.

### Setup Instructions

## Fork and Clone the extension 

Fork and clone the extension from the [GitHub repo](https://github.com/davidpolaniaac/azure-devops-publish-report-extension.git). 

To configure the extension, execute the following steps:

*   **Step 1: Change publisher**

Change the current publisher in the `config/release.json` configuration of your extension source code directory.

For example:

```
publisher: "davidpolaniaac"
```

*   **Step 2: Run Npm Install**

Run the npm install to install dependencies the extension:

```
 npm install
```

The output `successful` is generated in the `node_modules` folder.

*   **Step 3: Run Npm Build**

Run the npm build to build the extension:

```
 npm run build
```

The output `successful` is generated in the `dist` folder.

*   **Step 4: Run Npm Package**

Run the npm package to package the extension:

```
 npm run package
```

The output `successful` is copy source in the `dist` folder.

*   **Step 4: Run Npm Create**

Run the npm create to create the extension:

```
 npm run create
```

The output `successful` is generated in the `dist` folder.

### Sample Release configuration File

The sample `release.json` file lists parameter values to configure the extension. Set the parameters based on your environment setup.

``` 
{
    "id": "publish-html-report",
    "publisher": "davidpolaniaac",
    "public": false
}
```

**Note**: For information on generating your extension, refer to [Create extension](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops).
