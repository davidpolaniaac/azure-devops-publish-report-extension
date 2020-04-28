const exec = require('child_process').execSync;
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');

/**
 * Build tasks.
 */
function buildTasks() {
    fs.readdir('tasks', (err, files) => {
        files.forEach(taskName => {
            let taskDir = path.join('tasks', taskName);
            // If a package.json is missing, npm will exec the install command on the parent folder. This will cause an endless install loop.
            if (fs.existsSync(path.join(taskDir, "package.json"))) {
                execNpm('build', taskDir);
            } else {
                fs.readdir(taskDir, (err, taskVersionDirs) => {
                    taskVersionDirs.forEach(versToBuild => {
                        let taskVersionDir = path.join(taskDir, versToBuild);
                        if (fs.existsSync(path.join(taskVersionDir, "package.json"))) {
                            execNpm('build', taskVersionDir);
                        }
                    })
                });
            }
        });
    });
}

/**
 * Build Websites.
 */
function buildWebsites() {

    let websiteDir = path.join(process.cwd(), 'websites');
    if (fs.existsSync(path.join(websiteDir, "package.json"))) {
        execNpm('build', websiteDir);
    }
}

/**
 * Clean dist files.
 * @param cwd - (String) - Current working directory.
 */
function clean(cwd) {
    rimraf.sync(path.join(cwd, 'dist'));
}

/**
 * Build directory and execute npm command.
 * @param command - (String) - The command to execute, i.e. install, pack, etc.
 * @param cwd - (String) - Current working directory.
 */
function execNpm(command, cwd) {
    clean(cwd);
    exec('npm run ' + command, { cwd: cwd, stdio: [0, 1, 2] });
}

buildTasks();

buildWebsites();