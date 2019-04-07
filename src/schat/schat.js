const readline = require('readline');
const logger = require('logger');
const CLI = require('cli');

/* RUNNERS */

/** 
 * TODO
 * Runner for the 'add user to chat' function of schat. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:28:31 
 * @param     {String[]} input | parsed input, placed into string[]
 */
const addRunner = function(input)
{
    logger.info("Add runner input: " + input, __filename);

    //here should be the logic for adding a user to the chat
    cli.print("Added user to chat");
}

/** 
 * TODO
 * Runner for the 'help' command. This should print help information to the 
 * console. Using cli.print(str) is advised, as it is the only way to have the prompt 
 * print after the help information is displayed. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:49:55 
 * @param     {String[]} input | parsed input, place into string[]
 */
const helpRunner = function(input)
{
    logger.info("Help runner input: " + input);

    //logic for help command    
    cli.print("Help information");
}

/*set up the 'CLI'*/
let cliMap = new Map();
let programName = "schat";
let prompt = programName + "> ";
cliMap.set("add", addRunner);
cliMap.set("--help", helpRunner);
let cli = new CLI(programName, prompt, cliMap);

/*start the cli (begin reading input from stdin)*/
cli.start();