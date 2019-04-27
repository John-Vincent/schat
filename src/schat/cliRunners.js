const logger = require('logger');
const network = require('./network');
const encryption = require('./encryption');

const CLIRunners = new Map();

/** 
 * TODO
 * Runner for the 'add user to chat' function of schat. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:28:31 
 * @param     {String[]} input | parsed input, placed into string[]
 */
CLIRunners.set("add", (input, cli) =>
{
    logger.info("Add runner input: " + input, __filename);

    //here should be the logic for adding a user to the chat
    cli.print("Added user to chat");
});

/** 
 * Runner for the 'help' command. This should print help information to the 
 * console. Using cli.print(str) is advised, as it is the only way to have the prompt 
 * print after the help information is displayed. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:49:55 
 * @param     {String[]} input | parsed input, place into string[]
 */
CLIRunners.set("--help", (input, cli) =>
{
    logger.info("Help runner input: " + input);

    if(cli.io)
    {
        //logic for help command    
        cli.print("Help information");
    }
    else
    {
        let spacing = "    ";

        console.log("<schat help>\n" + 
            "commands:\n" + 
            spacing + "keys\n" + 
            spacing + spacing + "generate - Generates a key pair and writes it to the ~/.schat directory for future use\n" +           
                        spacing + spacing + spacing + "(Example: schat keys generate)\n" + 
            spacing + spacing + "import - Attempts to import keys at the given filepath\n" + 
            spacing + spacing + spacing + "--priv imports a private key (Example: schat keys import --priv ~/.ssh/id_rsa)\n" + 
            spacing + spacing + spacing + "--pub imports a public key (Example: schat keys import --pub ~/.ssh/id_rsa.pub)\n" + 
            spacing + spacing + spacing + "--fpub imports a foreign public key, this will be the key of the user you which to connect to, \n" + 
                        spacing + spacing + spacing + "  this is to facilitate encryption. (Example: schat keys import --fpub ~/.ssh/alices_key.pub)\n" + 
            spacing + spacing + spacing + "  Note: All of these commands above can be used together after import multiple keys. \n" + 
                        spacing + spacing + spacing + "  (Example: schat keys import --priv ~/.ssh/id_rsa --pub ~/.ssh/id_rsa.pub --fpub ~/.ssh/alices_key.pub)\n" + 
            spacing + "start-chat\n" + 
            spacing + spacing + "IP:PORT. Example (schat start 127.0.0.1:8080). \n" + spacing + spacing + "This will start an schat connection with the specified address. This will start the schat shell.");        
    }
});


module.exports = CLIRunners;