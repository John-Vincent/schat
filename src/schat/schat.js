const CLI = require('cli');
const CLIRunners = require('./cliRunners');

let programName = "schat";
let prompt = programName + "> ";

const cli = new CLI(programName, prompt, CLIRunners);
cli.parseAndRun(process.argv.slice(2, process.argv.length), true);
