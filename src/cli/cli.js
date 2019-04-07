const logger = require('logger');
const readline = require('readline');

/** 
 * Constructor for the CLI object. The program name should be passed as the 
 * first parameter, and the cliMap as the second. The cliMap should be a 
 * map of command strings to their runners (functions to be executed if the matching command
 * is found). 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 20:33:27 
 * @param     {String}     | name of the program using this CLI object
 * @param     {Map<String, Function} | map of command strings and their corresponding runners (functions)  
 */
function CLI(programName, prompt, cliMap)
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
    this.prompt = prompt ? prompt : this.programName + " > ";
    this.io = readline.createInterface(
        {
            input : process.stdin,
            output : process.stdout
        });
}

/** 
 * Takes input string and parses it into a string array by splitting the original input string by spaces.
 * Once the input is parsed, this function will attempt to execute the given 'runner' for the 
 * first 'command' (this will be the first string in the parsed input string[]). If the runner exists, 
 * it will be called, passing the parsed input string[] as the arguments and this function will return true. 
 * If no runner exists, or the original input is null, empty, or undefined, false will be returned. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 20:27:16 
 * @param     {String} input 
 * @return    {Boolean}    | true if runner exists, false if not
 */
CLI.prototype.parseAndRun = function(input)
{
    let parsedInput = input.split(" "); 
    let runner = this.cliMap.get(parsedInput[0]);

    if(parsedInput.length > 0 && runner)
    {
        logger.info("Parsing input and executing command", __filename);
        runner(parsedInput);
        return true;
    }
    else if(parsedInput.length == 0)
    {
        logger.error("Input is empty, null, or undefined", __filename);
        return false;
    }
    else if(!runner)
    {
        logger.error("Input has no corresponding runner", __filename);
        this.print(parsedInput[0] + " is not a command, try --help");
        return false;
    }
}

/** 
 * Kicks off the cli. Writes prompt to stdout, and listens on stdin for user input.
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:34:24    
 */
CLI.prototype.start = function()
{
    this.io.setPrompt(this.prompt);
    this.io.prompt();
    
    this.io.on('line', (line) => 
    {
        logger.info("Read input: " + line, __filename);
        this.parseAndRun(line);
        this.io.prompt();
    });
}

/** 
 * Simply prints the given string, plus a new line, to the console. 
 * It is best to wrap it in this function when using the 'CLI', as 
 * it is the only way to print the prompt to the console after 
 * the given string is printed. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:52:36 
 * @param     {String} str | string to be printed to the console
 */
CLI.prototype.print = function(str)
{
    console.log(str + "\n");
    this.io.prompt();
}

/* EXAMPLE CODE */

/*
var helpRunnerExample = (input) =>
{
    logger.info("Helper input: " + input, __filename);
}

var cliMap = {};
cliMap["--help"] = helpRunnerExample;

const cli = new CLI("s-chat", cliMap);
cli.parseAndRun("--help this that");
*/

module.exports = CLI;