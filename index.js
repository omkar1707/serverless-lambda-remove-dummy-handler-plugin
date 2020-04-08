'use strict';
const fs = require('fs');
const yaml = require('js-yaml');

class ServerlessRemoveDummyHandlerPlugin {

    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;

        this.commands = {
            removeDummyHandler: {
                usage: 'Remove Handler functions from cloud formation json',
                lifecycleEvents: ['init'],
                options: {
                    skipFunctions: {
                        usage:
                            'Specify the comma separated function names to skip from removal ' +
                            '(e.g. "--skipFunctions \'function1,function2\'" or "-s \'function1,function2\'")',
                        required: false,
                        shortcut: 's',
                    },
                    package: {
                        usage:
                            'Specify the package path. Default value is root directory .serverless' +
                            '(e.g. "--package \'.serverless\'" or "-p \'.serverless\'")',
                        required: false,
                        shortcut: 'p',
                    },
                },
            },
        };

        this.hooks = {
            'removeDummyHandler:init': this.init.bind(this)
        };
    }

    async init() {
        this.serverless.cli.log('Running removeDummyHandler');

        const servicePath = this.serverless.config.servicePath;
        let serverLessDirPath = servicePath + '/' + '.serverless';

        //Overwrite the default serverless directory path
        if (this.options.package) {
            serverLessDirPath = this.options.package;
        }

        //read all cloud formation json files
        const fileList = await this.readAllJSONFiles(serverLessDirPath);

        //read serverless.yml file
        const doc = yaml.safeLoad(fs.readFileSync(servicePath + '/serverless.yml', 'utf8'));
        const functions = doc.functions;

        //extract list of function
        const keys = Object.keys(functions);

        //remove skip functions
        this.removeSkipFunctions(keys, this.options.skipFunctions);

        //construct keys to macth for removal
        const newKeys = [];
        for (let i = 0; i < keys.length; i++) {
            newKeys.push(keys[i].toUpperCase() + "LAMBDA")
        }

        //iterate over all file to remove
        for (let i = 0; i < fileList.length; i++) {

            //read file
            const data = fs.readFileSync(fileList[i], 'utf8');
            const json = JSON.parse(data);

            this.serverless.cli.log('----------------------------');
            this.serverless.cli.log(`File : ${fileList[i]}`);

            //remove resouces
            this.serverless.cli.log('Removing Resources..........');
            if (json.Resources || json.service.provider.compiledCloudFormationTemplate.Resources) {
                const updatedJSON = await this.removeKeys(json.Resources || json.service.provider.compiledCloudFormationTemplate.Resources, newKeys);
                if (json.Resources) {
                    json.Resources = updatedJSON;
                } else if (json.service.provider.compiledCloudFormationTemplate.Resources) {
                    json.service.provider.compiledCloudFormationTemplate.Resources = updatedJSON;
                }
            }

            //remove output
            this.serverless.cli.log('Removing Output..........');
            if (json.Outputs || json.service.provider.compiledCloudFormationTemplate.Outputs) {
                const updatedJSON = await this.removeKeys(json.Outputs || json.service.provider.compiledCloudFormationTemplate.Outputs, newKeys);
                if (json.Outputs) {
                    json.Outputs = updatedJSON;
                } else if (json.service.provider.compiledCloudFormationTemplate.Outputs) {
                    json.service.provider.compiledCloudFormationTemplate.Outputs = updatedJSON;
                }
            }

            //write json to file
            fs.writeFileSync(fileList[i], JSON.stringify(json, null, 2));
        }

        this.serverless.cli.log('----------------------------');
        this.serverless.cli.log('Completed removeDummyHandler');
    }

    async removeSkipFunctions(functions, skipFunctions) {
        if (skipFunctions) {
            const split = skipFunctions.split(',');
            if (split) {
                for (let i = 0; i < split.length; i++) {
                    const index = functions.indexOf(split[i]);
                    if (index !== -1) functions.splice(index, 1);
                }
            }
        }
    }

    async readAllJSONFiles(directoryPath) {
        return new Promise(function (resolve, reject) {
            const fileList = [];
            fs.readdir(directoryPath, function (err, files) {
                if (err) {
                    this.serverless.cli.log('Unable to scan directory: ' + err);
                } else {
                    files.forEach(function (file) {
                        if (file.endsWith('.json'))
                            fileList.push(directoryPath + '/' + file)
                    });
                }
                resolve(fileList);
            });
        })
    }

    async removeKeys(json, removeKeys) {
        const finalKeysToRemove = [];
        const keys = Object.keys(json);
        for (let i = 0; i < keys.length; i++) {
            const keyToCheck = keys[i];
            for (let j = 0; j < removeKeys.length; j++) {
                const keyToRemove = removeKeys[j];
                if (keyToCheck.toLocaleLowerCase().indexOf(keyToRemove.toLowerCase()) >= 0) {
                    finalKeysToRemove.push(keyToCheck);
                    break;
                }
            }
        }
        for (let i = 0; i < finalKeysToRemove.length; i++) {
            delete json[finalKeysToRemove[i]]
        }
        this.serverless.cli.log(`Keys Removed : ${finalKeysToRemove}`);
        return json;
    }
}

module.exports = ServerlessRemoveDummyHandlerPlugin;
