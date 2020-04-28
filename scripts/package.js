const exec = require('child_process').execSync;
const rimraf = require('rimraf');
const fs = require('fs');
const path = require('path');

/**
 * Package tasks.
 */

function packageTasks() {
    fs.readdir('tasks', (err, files) => {
        files.forEach(taskName => {
            let taskDir = path.join('tasks', taskName);
            // If a package.json is missing, npm will exec the install command on the parent folder. This will cause an endless install loop.
            if (fs.existsSync(path.join(taskDir, "package.json"))) {
                packageTask(taskDir)
            } else {
                fs.readdir(taskDir, (err, taskVersionDirs) => {
                    taskVersionDirs.forEach(versToBuild => {
                        let taskVersionDir = path.join(taskDir, versToBuild);
                        if (fs.existsSync(path.join(taskVersionDir, "package.json"))) {
                            packageTask(taskVersionDir)
                        }
                    })
                });
            }
        });
    });
}

/**
 * Package Websites.
 */
function packageWebsites() {

    let websiteDir = path.join(process.cwd(), 'websites');
    if (fs.existsSync(path.join(websiteDir, "package.json"))) {
        cleanExecNpm('i', websiteDir);
    }
}


/**
 * Copy directory and execute npm command.
 * @param taskDir - (String) - The command to execute, i.e. install, pack, etc.
 * @param element - (String) - Current working directory.
 */
function copySources(taskDir, element) {
    let source = path.join(taskDir, element);
    let destination = path.join(taskDir, "dist", element);
    fs.copyFileSync(source, destination);
}

/**
 * execute npm command.
 * @param command - (String) - The command to execute, i.e. install, pack, etc.
 * @param cwd - (String) - Current working directory.
 */
function execNpm(command, cwd) {
    exec('npm ' + command + ' -q' + ' --only=production', { cwd: cwd, stdio: [0, 1, 2] });
}

/**
 * execute login of package.
 * @param taskDir - (String) - Current working directory.
 */
function packageTask(taskDir) {
    copySources(taskDir, "icon.png");
    copySources(taskDir, "task.json");
    copySources(taskDir, "package.json");
    let taskPackage = path.join(taskDir, "dist");
    execNpm('i', taskPackage);
}

packageTasks();

//packageWebsites();