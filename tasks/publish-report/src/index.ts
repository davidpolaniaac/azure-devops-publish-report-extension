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

async function saveReport(html: string, inputReportName: string, reportNameRandom: string) {

    try {

        banner("Save a report in pipeline");
        const SYSTEM_DEFAULTWORKINGDIRECTORY = tl.getVariable("SYSTEM_DEFAULTWORKINGDIRECTORY");
        tl.writeFile(`${SYSTEM_DEFAULTWORKINGDIRECTORY}/${reportNameRandom}.html`, html, 'utf8');
        tl.addAttachment('publish-report', `${inputReportName}.html`, `${SYSTEM_DEFAULTWORKINGDIRECTORY}/${reportNameRandom}.html`);
        heading("¡ report has been saved successfully in pipeline !");

    } catch (error) {
        throw new Error(error.message);
    }
}

function getName(name:string, index: number, size: number): string {
    const fixName: string = name.trim();
    return size > 1 ? `${index}-${fixName}`: fixName;
}

async function run() {
    try {
        const paths: string[] = tl.getDelimitedInput('htmlPath',',', true);
        const inputReportName: string = tl.getInput('reportName', true) as string;
        for (const [index, value] of paths.entries()) {
            const reportNameRandom: string = String(Date.now());
            const html = await createReport(value);
            const name: string = getName(inputReportName, index, paths.length);
            await saveReport(html, name, reportNameRandom);
        }
    } catch (error) {
        tl.error(error.message);
        tl.setResult(tl.TaskResult.Failed, 'Execution error');
    }
}

run();