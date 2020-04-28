const exec = require('child_process').execSync;
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');

/**
 * Install tasks.
 */
function installTasks() {
    fs.readdir('tasks', (err, files) => {
        files.forEach(taskName => {
            let taskDir = path.join('tasks', taskName);
            // If a package.json is missing, npm will exec the install command on the parent folder. This will cause an endless install loop.
            if (fs.existsSync(path.join(taskDir, "package.json"))) {
                cleanExecNpm('i', taskDir);
            } else {
                fs.readdir(taskDir, (err, taskVersionDirs) => {
                    taskVersionDirs.forEach(versToBuild => {
                        let taskVersionDir = path.join(taskDir, versToBuild);
                        if (fs.existsSync(path.join(taskVersionDir, "package.json"))) {
                            cleanExecNpm('i', taskVersionDir);
                        }
                    })
                });
            }
        });
    });
}

/**
 * Install Websites.
 */
function installWebsites() {

    let websiteDir = path.join(process.cwd(), 'websites');
    if (fs.existsSync(path.join(websiteDir, "package.json"))) {
        cleanExecNpm('i', websiteDir);
    }
}

/**
 * Clean npm install/pack files.
 * @param cwd - (String) - Current working directory.
 */
function clean(cwd) {
    rimraf.sync(path.join(cwd, 'node_modules'));
    rimraf.sync(path.join(cwd, 'package-lock.json'));
    rimraf.sync(path.join(cwd, '*.tgz'));
}

/**
 * Clean directory and execute npm command.
 * @param command - (String) - The command to execute, i.e. install, pack, etc.
 * @param cwd - (String) - Current working directory.
 */
function cleanExecNpm(command, cwd) {
    clean(cwd);
    exec('npm ' + command + ' -q', { cwd: cwd, stdio: [0, 1, 2] });
}

installTasks();

installWebsites();