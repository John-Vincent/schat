const logger = require('logger');

function CLI(programName, cliMap)
{
    if(!programName)
    {
        logger.error("A program name is required", __filename);
        return null;
    }

    if(!cliMap)
    {
        logger.error("A cliMap, a hash map between strings and runnables for those strings, is required", __filename);        
        return null;
    }

    this.programName = programName;
    this.cliMap = cliMap;
}

//TODO Add splitting by space so that runnables are given an array of input strings in order
CLI.prototype.parseAndRun = function(input)
{
    if(input && this.cliMap[input])
    {
        logger.info("Parsing input and executing command", __filename);
        this.cliMap[input](input);
    }
    else 
    {
        logger.error("Input is empty or there is no runnable for it", __filename);
    }
}

var helpRunnerExample = (input) =>
{
    logger.info("Helper input: " + input, __filename);
}

var cliMap = {};
cliMap["--help"] = helpRunnerExample;

const cli = new CLI("s-chat", cliMap);
cli.parseAndRun("--help");
logger.info(cli);