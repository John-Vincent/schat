const logger = require('logger');
const readline = require('readline');

class CLI
{
    /** 
     * Constructor for the CLI object. The program name should be passed as the 
     * first parameter, the prompt as the second  and the cliMap as the third. The cliMap should be a 
     * map of command strings to their runners (functions to be executed if the matching command
     * is found). 
     * @author    Matt Bechtel | mbechtel@iastate.edu 
     * @date      2019-04-06 20:33:27 
     * @param     {String}     | name of the program using this CLI object
     * @param     {Map<String, Function} | map of command strings and their corresponding runners (functions)  
     */
    constructor(programName, prompt, cliMap)
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
        this.shell = false;
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
    parseAndRun(input, split)
    {
        let unsplitInput = input;

        if(input.length == 0)
        {
            let errMsg = "No arguments, try --help";
            logger.error(errMsg, __filename);

            if(this.shell)
            {
                this.print(errMsg);
            }
            else 
            {
                console.error(errMsg);
            }

            return false;
        }

        if(!Array.isArray(input))
        {
            input = input.split(" "); 
        }

        let runner = this.cliMap.get(input[0]);

        if(split && input.length > 0 && runner)
        {
            logger.info("Parsing input and executing command", __filename);
            runner(input, this);
            return true;
        }
        else if(!split && unsplitInput.length > 0 && runner)
        {
            logger.info("Parsing input and executing command", __filename);
            runner(unsplitInput.slice("send-message ".length, unsplitInput.length), this);
            return true;
        }
        else if(!runner)
        {
            let errMsg = input[0] + " is not a command, try --help";
            
            logger.error(errMsg, __filename);

            if(this.shell)
            {
                this.print(errMsg);
            }
            else 
            {
                console.error(errMsg);
            }

            return false;
        }
    }

    /** 
     * Kicks off the cli. Writes prompt to stdout, and listens on stdin for user input.
     * @author    Matt Bechtel | mbechtel@iastate.edu 
     * @date      2019-04-06 21:34:24    
     */
    start(sendMessageRunnerName)
    {
        this.shell = true;
        this.io = readline.createInterface(
            {
                input : process.stdin,
                output : process.stdout
            });
        this.io.setPrompt(this.prompt);
        this.io.prompt();
        
        this.io.on('line', (line) => 
        {
            logger.info("Read input: " + line, __filename);

            if(line != '--help' && sendMessageRunnerName)
            {
                line = sendMessageRunnerName + " " + line;
            }

            this.parseAndRun(line, false);
            this.io.prompt();
        })
        .on('close', () => 
        {
            console.log('\n\nGoodbye.');
            process.exit(0);
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
    print(str)
    {
        console.log(str);

        if(this.shell)
        {
            this.io.prompt();
        }
    }    

    printError(str)
    {
        console.error(str);

        if(this.shell)
        {
            this.io.prompt();
        }
    }
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
