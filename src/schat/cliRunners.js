const logger = require('logger');
const network = require('./network');
const encryption = require('./encryption');

const CLIRunners = new Map();

/** 
 * Starts chat with given IP:PORT
 * Runner for the 'add user to chat' function of schat. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-06 21:28:31 
 * @param     {String[]} input | parsed input, placed into string[]
 */
CLIRunners.set("start-chat", (input, cli) =>
{
    logger.info("Starting chat with input: " + input, __filename);

    let address = input[1].split(':');

    if(input.length == 0)
    {
        cli.printError("An address to connect to must be specified, see '--help'");
        return;
    }

    let remotePort = address[1] != undefined ? address[1] : 4567;
    let localPort = 4567;

    let receptionCallback = (msg) =>
    {
        cli.print("\nMessage from peer: " + msg);
    }

    if(input[2] == "-p" && input[3])
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

CLIRunners.set("send-message", (input, cli) =>
{
    network.send(input);
});

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
 */
CLIRunners.set("--help", (input, cli) =>
{
    logger.info("Help runner input: " + input);

        let spacing = "    ";

    cli.print("<schat help>\n" + 
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
        spacing + spacing + "'-p' can be used to specify the port that schat runs on, (example: schat start-chat 127.0.0.1:3000 -p 4567, here schat will serve on port 4567)\n" + 
        spacing + spacing + "IP:PORT or IP (this will try and connect to IP:4567). Example (schat start-chat 127.0.0.1:8080). \n" + spacing + spacing + "This will start an schat connection with the specified address. This will start the schat shell.");        

});


module.exports = CLIRunners;