const logger = require('logger');
const network = require('./network');
const encryption = require('./encryption');
const Constants = require('./constants');

const CLIRunners = new Map();

/** 
 * Starts chat with given options.
 * Runner for 'start-chat'. Starts an schat connection with the given options.
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

    //callback when message is received
    let receptionCallback = (msg) =>
    {
        cli.print("\nMessage from peer: " + msg);
    };

    //callback when connection is closed
    let closeCallback = () => 
    {
        cli.print('Peer disconnected...\nGoodbye.'); 
        process.exit(0);
    };

    //get the start-chat options from the input, then perform accordingly
    getStartChatOptions(input.slice(1, input.length))
        .then((startChatOptions) =>
        {
            //options to set up the network
            var networkOptions = 
            {
                local_port: startChatOptions.localPort, 
                remote_port: startChatOptions.remotePort, 
                remote_address: startChatOptions.address, 
                callback: receptionCallback, 
                closeCallback: closeCallback
            };

            //keys, provided by user as options
            let keys =
            {
                priv : startChatOptions.privateKey,
                pub : startChatOptions.publicKey,
                fpub : startChatOptions.foreignPubKey
            };
        
            //make sure their not trying to just use one key, it must be a pair 
            if(keys.priv && !keys.pub || !keys.priv && keys.pub)
            {
                cli.printError("Must provide private and public key as a pair, if provided");    
                return;
            }

            //check that their not trying to use a fpub and save that fpub (redundant)
            if(keys.fpub && startChatOptions.saveFPub)
            {
                cli.printError("Cannot download a foreign key with one already specified");
                return;
            }

            //set the forign public key up for saving when connection is closed
            if(startChatOptions.saveFPub)
            {
                Promise.resolve(encryption.saveKeys({fpub : startChatOptions.saveFPub}));
            }

            //user specifies temp keys and a foreign public key
            if(startChatOptions.tempKeys && keys.fpub)
            {
                cli.print("Using temp local keys, with a set foriegn key");
                keys.priv = undefined;
                keys.pub = undefined;

                //set the given keys, then reset them using generate keys
                encryption.setKeys(keys)
                    .then(() =>
                    {
                        return encryption.generateKeys()
                            .then(() =>
                            {
                                return network.open(networkOptions)
                                    .then(() => 
                                    {
                                        cli.start("send-message");
                                    });
                            });
                    })
                    .catch(cli.printError);
            }

            //user specifies temp keys and does not provide an fpub, generate temp keys and try and connect
            if(startChatOptions.tempKeys && !keys.fpub)
            {
                cli.print("Starting chat using temporary keys");

                encryption.generateKeys()
                    .then(() =>
                    {
                        return network.open(networkOptions)
                            .then(() => 
                            {
                                cli.start("send-message");
                            });
                    })
            }

            //user did not specify temp keys, (default behavior)
            if(!startChatOptions.tempKeys)
            {
                //key pair was provided 
                if(keys.priv && keys.pub)
                {
                    cli.print("Using specified key pair, private: " + keys.priv + ", public: " + keys.pub);
                }

                //foreign key was provided
                if(keys.fpub)
                {
                    cli.print("Using foriegn key, " + keys.fpub);
                }

                //no key pair was provided, use default keys
                if(!keys.priv && !keys.pub)
                {
                    cli.print("Using default key pair in ~/.schat");
                }

                //set given keys and try and connect
                encryption.setKeys(keys)
                    .then((err) =>
                    {
                        if(err && err[0])
                        {
                            cli.printError("No key private or public keys found, run 'schat key-gen' or provide keys with --priv and --pub (see --help)");
                        }
                        else if(keys.fpub && err && err[0])
                        {
                            cli.printError("Failed to find foreign public key");
                        }
                        else
                        {
                            return network.open(networkOptions)
                                .then(() => 
                                {
                                    cli.start("send-message");
                                });
                        }
                    })
                    .catch((err)=>
                    {
                        cli.printError(err);
                    });
            }
        
            cli.print("Adding " + startChatOptions.address + ":" + startChatOptions.remotePort + " to chat");
        })
        .catch((err) =>
        {
            logger.error(err, __filename);
            cli.printError(err);
        });    
});

/** 
 * Helper method to get the start-chat options out of the user input. Returns promise that
 * when resolve gives an 'startChatOptions' object. 
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-05-09 00:47:24 
 * @param     {String[]} input | parsed input, place into string[]
 * @return    {Promise} 
 */
const getStartChatOptions = (input) =>
{
    return new Promise((resolve, reject) => 
    {
        //set up empty options object
        const options = 
        {
            address : undefined,
            remotePort : undefined,
            localPort : undefined,
            privateKey : undefined,
            publicKey : undefined,
            foriegnPubKey : undefined,
            saveFPub : undefined,
            tempKeys : undefined
        };
    
        //no options, return
        if(input.length == 0) resolve();  

        //split address argument to get the IP and PORT
        let addressArg = input[0].split(':');
        options.remotePort = addressArg[1] != undefined ? addressArg[1] : Constants.default_port;
        options.address = addressArg[0];

        //get the indecies of all of the flags possible (set in the constants file)
        let localPortIndex = input.indexOf(Constants.start_chat_flags.localPort);
        let privateKeyIndex = input.indexOf(Constants.start_chat_flags.privateKey);
        let publicKeyIndex = input.indexOf(Constants.start_chat_flags.publicKey);
        let foreignPubKeyIndex = input.indexOf(Constants.start_chat_flags.foreignPubKey);    
        let saveFPubIndex = input.indexOf(Constants.start_chat_flags.saveFPub);
    
        //if cases to set the options values from the input
        if(localPortIndex != -1 && input[localPortIndex + 1])
        {
            options.localPort = parseInt(input[localPortIndex + 1]);
        }
    
        if(privateKeyIndex != -1 && input[privateKeyIndex + 1])
        {
            options.privateKey = input[privateKeyIndex + 1];
        }
    
        if(publicKeyIndex != -1 && input[publicKeyIndex + 1])
        {
            options.publicKey = input[publicKeyIndex + 1];
        }
    
        if(foreignPubKeyIndex != -1 && input[foreignPubKeyIndex + 1])
        {
            options.foreignPubKey = input[foreignPubKeyIndex + 1];
        }
    
        if(saveFPubIndex != -1 && input[saveFPubIndex + 1])
        {
            options.saveFPub = input[saveFPubIndex + 1];
        }

        if(input.includes(Constants.start_chat_flags.tempKeys))
        {
            options.tempKeys = true;
        }
        
        resolve(options);
    });    
};

/** 
 * Runner to send a message, this will passed to the cli as the runner to use when sending a message
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:22:35    
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("send-message", (input, cli) =>
{   
    if(!cli.shell)
    {
        let errMsg = "Cannot send message without an active connection";
        cli.printError(errMsg);
        return;
    }

    network.send(input);
});

/** 
 * Runner to generate new keys and save them to the schat directory
 * @author    Matt Bechtel | mbechtel@iastate.edu 
 * @date      2019-04-27 22:25:42 
 * @param     {String[]} input | parsed input, place into string[]
 * @param     {CLI} cli | an instance of cli to be used
 */
CLIRunners.set("key-gen", (input, cli) => 
{
    //TODO
    logger.info("Starting key pair generation", __filename);
    cli.print("Generating key pair and storing it in ~/.schat/");
    Promise.resolve(encryption.generateKeysAndSave());
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
            twoSpaces + "By default schat will use the set of keys 'priv_key' and 'pub_key'\n" +
            twoSpaces + "in the ~/.schat directory. If this key pair does not exist you must run this command\n" + 
            twoSpaces + "to generate the private-public RSA key pair and write it\n" +
            twoSpaces + "to the ~/.schat directory for usage in future schat chatting sessions. \n" + 
            twoSpaces + "If previously ran, this will replace the old key pair that was generated,\n" +
            twoSpaces + "meaning that if you want to save generated keys elsewhere, you must move them yourself.\n" + 
            twoSpaces + "When a chat is started, without a key pair specified (default usage), schat will use\n" +
            twoSpaces + "the key pair generated by this command, i.e the key pair stored in ~/.schat. \n" +
            twoSpaces + "***If you wish to use temporary keys, please use the flag '--temp-keys'\n" +  
            threeSpaces + "Example: 'schat key-gen'\n" + 
        space + "start-chat\n" + 
            twoSpaces + "Default Usage: Start a chat with another user. Example 'schat start-chat IP'.\n" + 
                threeSpaces + "Here, IP is the IP of the user you wish to chat with.\n" + 
                threeSpaces + "By default, this will try and create an schat connection with \n" + 
                threeSpaces + "the IP on the default port 4567.\n" + 
                threeSpaces + "To change the port of the user you wish to connect to just specify\n" + 
                threeSpaces + "it after a colon, like this, IP:PORT. Example: 'schat start-chat IP:PORT'\n" + 
            twoSpaces + "Specify the port you wish to serve schat on\n" + 
                threeSpaces + "'--port [PORT]'\n" +
                threeSpaces + "  Example: 'schat start-chat 127.0.0.1 --port 4567'\n" +     
            twoSpaces + "Specify keys to use for encryption: \n" +
                threeSpaces + "'--priv [FILEPATH]' (your private key)\n" + 
                threeSpaces + "'--pub [FILEPATH]' (your public key)\n" + 
                threeSpaces + "'--fpub [FILEPATH]' (specify public key for user you which to connect to)\n" + 
                threeSpaces + "  Example: 'schat start-chat IP --priv ~/.schat/id_rsa --pub ~/.schat/id_rsa.pub --fpub ~/.schat/alices_key.pub'\n" + 
            twoSpaces + "Download foreign public key from chatting partner for future use\n" + 
                threeSpaces + "'--save-fpub [FILEPATH]'\n" + 
                threeSpaces + "  Example: 'schat start-chat IP --save-fpub ./pathToSaveTo'\n" +
            twoSpaces + "Use temporary key pair\n" + 
                threeSpaces + "'--temp-keys'\n" + 
                threeSpaces + "  Example: 'schat start-chat IP --temp-keys'"
    );
    
});


module.exports = CLIRunners;
