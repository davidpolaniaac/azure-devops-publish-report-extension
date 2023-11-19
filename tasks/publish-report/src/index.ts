import * as tl from 'azure-pipelines-task-lib/task';

const Inliner = require('inliner');

function banner(title: string): void {
    console.log();
    console.log('=======================================');
    console.log('\t' + title);
    console.log('=======================================');
    console.log();
}

function heading(title: string): void {
    console.log();
    console.log('> ' + title);
}

async function createReport(path: string): Promise<any> {
    return new Promise(function (resolve, reject) {
        new Inliner(path, function (error: any, html: any) {
            if (error) {
                reject(new Error('the report could not be converted,  validate that the report exists !'))
            } else {
                resolve(html);
            }
        });
    });
}

async function saveReport(html: string, inputReportName: string) {

    try {
        const tempDirectory = tl.getVariable("Agent.TempDirectory");
        const reportNameRandom: string = String(Date.now());
        tl.writeFile(`${tempDirectory}/${reportNameRandom}.html`, html, 'utf8');
        tl.addAttachment('publish-report', `${inputReportName}.html`, `${tempDirectory}/${reportNameRandom}.html`);
    } catch (error) {
        throw new Error(error.message);
    }
}

function handleFailedResult(errorMessage: string): never {
    tl.setResult(tl.TaskResult.Failed, errorMessage, true);
    throw new Error(errorMessage);
}

function handleSuccessResult(result: string[]): string[] {
    console.log(`Found ${result.length} reports.`);
    console.log(result);
    return result;
}

function isURL(path: string): boolean {
    return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(path);
}

function findReports(reportPattern: string): string[] {
    if (reportPattern.length === 0) {
        handleFailedResult("Report filepath cannot be empty. Please provide a path to the report.");
    }

    if (isURL(reportPattern)) {
        return handleSuccessResult([reportPattern]);
    }

    try {
        tl.checkPath(reportPattern, 'path');
        return handleSuccessResult([reportPattern]);
    } catch (error) {
        console.log(`Path validation: ${reportPattern}`);
    }

    const reportPaths: string[] = tl.findMatch(tl.getVariable("Agent.BuildDirectory") || process.cwd(), reportPattern);

    if (!reportPaths || reportPaths.length === 0) {
        handleFailedResult(`No reports found with filepath pattern ${reportPattern}`);
    }

    return handleSuccessResult(reportPaths);
}

async function run() {
    try {
        const paths: string[] = tl.getDelimitedInput('htmlPath', ',', true);
        const names: string[] = tl.getDelimitedInput('reportName', ',', true);
        banner("Save a report in pipeline");
        for (const [index, path] of paths.entries()) {
            const subPaths: string[] = findReports(path);
            for (const [subIndex, subPath] of subPaths.entries()) {
                const html = await createReport(subPath);
                let name: string = "";
                const baseName: string = names[index] ? names[index] : "Report";
                if (paths.length > 1 && subPaths.length > 1) {
                    name = `${index + 1}.${subIndex + 1}-${baseName}`
                } else if (paths.length <= 1 && subPaths.length > 1) {
                    name = `${subIndex + 1}-${baseName}`
                } else {
                    name = baseName;
                }
                await saveReport(html, name.trim());
                console.info("Uploading report " + subPath + " - " + subIndex + 1 + " of " + subPaths.length);
            }
            tl.setProgress(index + 1 / paths.length * 100, "Uploading reports")
        }
        heading("Report has been saved successfully in pipeline !");
    } catch (error) {
        tl.error(error.message);
        tl.setResult(tl.TaskResult.Failed, 'Execution error');
    }
}

run();