const logger = require('logger');
const network = require('./network');
const encryption = require('./encryption');

const CLIRunners = new Map();

/** 
 * Starts chat with given IP:PORT
 * Runner for 'start-chat'. Starts an schat connection with the given IP and port
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:28:31 
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("start-chat", (input, cli) =>
{
    logger.info("Starting chat with input: " + input, __filename);

    if(input.length < 2)
    {
        cli.printError("An address to connect to must be specified, see '--help'");
        return;
    }

    let address = input[1].split(':');
    let remotePort = address[1] != undefined ? address[1] : 4567;
    let localPort = 4567;

    let receptionCallback = (msg) =>
    {
        cli.print("\nMessage from peer: " + msg);
    }

    if(input[2] == "--port" && input[3])
    {
        localPort = parseInt(input[3]);
    }

    var options = {local_port: localPort, remote_port: remotePort, remote_address: address[0], callback: receptionCallback, closeCallback: ()=>{console.log('Peer disconnected...\nGoodbye.'); process.exit(0)}};

    //This needs to be changed to load in existing keys, that should be done via 
    //scanning the ~/.schat directory for them 
    encryption.generateKeys()
        .then(()=>
        {
            return network.open(options).then(() => 
            {
                cli.start("send-message");
            });
        })
        .catch(cli.printError);

    //here should be the logic for adding a user to the chat
    cli.print("Adding " + address[0] + ":" + remotePort + " to chat");
});

/** 
 * Runner to send a message, this will passed to the cli as the runner to use when sending a message
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:22:35    
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("send-message", (input, cli) =>
{
    network.send(input);
});

/** 
 * Runner for the 'keys' commands. This runner will dispatch to the correct runner for the given key functionality
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:23:33    
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("keys", (input, cli) =>
{
    let option = input.slice(1, input.length);

    if(input.length == 0)
    {
        cli.printError("call to keys must be provided with a mode, generate or import");
        return;
    }
    else if(option) 
    {
        cli.parseAndRun(option);
    }    
});

/** 
 * Runner for importing keys passed by the user as filepaths.
 * This runner will look for flags --priv, --pub, --fpub, with the file paths following the flags (ex: --priv ~/.ssh/id_rsa)
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:24:30 
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("import", (input, cli) =>
{
    let keys = {};

    if(input.length < 2)
    {
        cli.printError("A filepath must be providied to the import commnad");
    }
    
    for(let i = 2; i < input.length; i++)  
    {
        if(input[i] == "--priv" && input[i + 1])
        {
            keys.priv = input[i + 1];
        }
        else if(input[i] == "--pub" && input[i + 1])
        {
            keys.pub = input[i + 1];
        }
        else if(input[i] == "--fpub" && input[i + 1])
        {
            keys.fpub = input[i + 1];
        }
    }

    if(keys.pub || keys.priv || keys.fpub)
    {
        encryption.setKeys(keys);
    }
})

/** 
 * Runner to generate new keys and save them to the schat directory
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:25:42 
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("generate", (input, cli) => 
{
    cli.print("Generating keys");
    Promise.resolve(encryption.generateKeys());
});

/** 
 * Runner for the 'help' command. This should print help information to the 
 * console. Using cli.print(str) is advised, as it is the only way to have the prompt 
 * print after the help information is displayed. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:49:55 
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("--help", (input, cli) =>
{
    logger.info("Help runner input: " + input);

        let space = "    ";
        let twoSpaces = space + space;
        let threeSpaces = twoSpaces + space;
    cli.print("<schat help>\n" + 
        "commands:\n" + 
        space + "key-gen\n" + 
            twoSpaces + "By default schat will generate a new key pair for every chat session.\n" +
            twoSpaces + "To use the same key pair every time, this command should be used.\n" +
            twoSpaces + "This command generates a private-public RSA key pair and writes\n" +
            twoSpaces + "it to the ~/.schat directory,for usage in future schat chatting sessions. \n" + 
            twoSpaces + "If previously ran, this will replace the old key pair that was generated.\n" + 
            twoSpaces + "When a chat is started, without a key pair specified (default usage), schat will use\n" +
            twoSpaces + "the key pair generated by this command, i.e the key pair stored in ~/.schat. \n" + 
            threeSpaces + "Example: 'schat key-gen'\n" + 
        space + "start-chat\n" + 
            twoSpaces + "Default Usage: Start a chat with another user. Example 'schat start-chat IP'.\n" + 
                threeSpaces + "Here, IP is the IP of the user you wish to chat with.\n" + 
                threeSpaces + "By default, this will try and create an schat connection with \n" + 
                threeSpaces + "the IP on the default port 4567\n" + 
                threeSpaces + "To change the port of the user you wish to connect to just specify\n" + 
                threeSpaces + "it after a colon, like this, IP:PORT. Example: 'schat start-chat IP:PORT'\n" + 
            twoSpaces + "Specify the port you wish to serve schat on\n" + 
                threeSpaces + "--port [PORT]\n" +
                threeSpaces + "  Example: 'schat start-chat 127.0.0.1 --port 4567'\n" +     
            twoSpaces + "Specify keys to use for encryption: \n" +
                threeSpaces + "--priv [FILEPATH] (your private key)\n" + 
                threeSpaces + "--pub [FILEPATH] (your public key)\n" + 
                threeSpaces + "--fpub [FILEPATH] (specify public key user you which to connect to)\n" + 
                threeSpaces + "  Example: 'schat start-chat IP --priv ~/.ssh/id_rsa --pub ~/.ssh/id_rsa.pub --fpub ~/.ssh/alices_key.pub'\n" + 
            twoSpaces + "Download foreign public key from chatting partner for future use\n" + 
                threeSpaces + "--save-fpub [FILEPATH]\n" + 
                threeSpaces + "  Example: 'schat start-chat IP --save-fpub ./pathToSaveTo'\n"
    );
    
});


module.exports = CLIRunners;