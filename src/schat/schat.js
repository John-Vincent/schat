const readline = require('readline');
const logger = require('logger');
const CLI = require('cli');
const CLIRunners = require('./cliRunners');

let programName = "schat";
let prompt = programName + "> ";
const cliRunnerMap = new Map();

class SChat 
{
    constructor(cliMap)
    {
        this.cli = new CLI(programName, prompt, cliMap);
    }

    runCommand(command)
    {
        this.cli.parseAndRun(command, true);
    }
}

const schat = new SChat(CLIRunners);
schat.runCommand(process.argv.slice(2, process.argv.length));