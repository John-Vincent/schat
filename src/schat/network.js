const net = require('net');
const dns = require('dns');
const encryption = require('./encryption.js');
const logger = require('logger');
const { init_packet_types, error_codes } = require('./constants.js');
const network = {};

var port = 4567;
var socket = net.Socket();
var server;

/**
 *  function to start network connection
 *  takes single argument that is an object
 *  that can contain settings for 'port'
 *  which is the local port to connect from,
 *  'remote_port' which is the port to try
 *  and connect to, 'remote_address' which
 *  is the ip or url to connect to, and 
 *  'callback' which is the function that will 
 *  be called when data is receieved from the
 *  connection.
 */
network.open = function(options)
{
    if(!options || !options.remote_address || !options.callback)
    {
        var err = new Error();
        err.message = "must set callback and remote_address options";
        return err;
    }

    if(!options.remote_port)
        options.remote_port = port;
    
    return new Promise((resolve, reject)=>
    {

        dns.lookup(options.remote_address, (err, address, family)=>
        {
            if(err)
                reject(err);
            else
            {
                options.remote_address = address;
                var startup = initalizeConnection(options);
                
                //normalize port variables
                port = options.local_port = options.local_port || port;
                //attach handlers to the socket
                attach_handlers(socket, {
                    callback: startup.callback, 
                    error: make_server(startup.callback, options), 
                    connection: ()=>
                    {
                        socket.on('error', options.error || console.error);
                    }
                });
                //set new error handler for active connection
                socket.connect({localPort: port, port: options.remote_port, host: options.remote_address});
                resolve(startup.promise);
            }
        });
    });
}

/**
 *  ends the socket connection.
 *  assumes the socket is set up.
 */
network.close = function()
{
    socket.end();
}


/**
 *  encrypts and sends the data
 *  over the socket connection
 */
network.send = function(data)
{
    logger.debug('SENDING DATA: ')
    logger.debug(data);
    var encrypted = encryption.encrypt('session', JSON.stringify(data));
    logger.debug('DATA ENCRYPTED TO: ' + encrypted);
    socket.write(encrypted);
}

/**
 *  returns a promise as well as a callback.
 *  the callback will be set up as the data
 *  handler on the tcp connection. This
 *  callback will then run through the
 *  logic to initalize the secure connection
 *  between the peers and then resolves the
 *  promise when the connect has been set up
 *  and tested.
 */
function initalizeConnection(options)
{
    var init, keys_ready = false; 
    var promise = new Promise((resolve, reject)=>
    {
        init = (data)=>
        {
            //check if you are first to try and connect
            if(!data)
            {
                
            } 
            else
            {
                data = JSON.parse(data);
                logger.debug(data);
                //handle the different packet types received
                switch(data.type)
                {
                    case init_packet_types.keyRequest:
                        keyAnswer();
                        break;
                    case init_packet_types.key:
                        if(!encryption.isForeignSet())
                        {
                            encryption.setForeignKey(data.key);
                        }
                        keys_ready = true;
                        keysReady();
                        break;
                    case init_packet_types.verifyKey:
                        verifyAnswer(data);
                        break;
                    case init_packet_types.verifyAnswer:
                        if(data.ans)
                            keys_ready=true;
                        else
                        {
                            socket.end();
                            var error = new Error('invalid private key');
                            error.code = KEY_MATCH_ERROR;
                            reject(error);
                        }
                        keysReady();
                        break;
                    case init_packet_types.keysReady:
                        if(keys_ready)
                        {
                            sessionSegment();
                        }
                        else if(encryption.isForeignSet())
                        {
                            verifyKey();
                        }
                        else
                        {
                            keyRequest();
                        }
                        break;
                    case init_packet_types.sessionSegment:
                        data.key = encryption.decrypt('private', data.key);
                        if(encryption.setSessionSegment(data.key))
                        {
                            testSessionKey();
                        }
                        else
                        {
                            sessionSegment();
                        }
                        break;
                    case init_packet_types.sessionTest:
                        var ans = data.value == encryption.decrypt('session', data.encrypt);
                        sessionResponse(ans);
                        if(!ans)
                        {
                            var error = new Error('session keys failed to be set');
                            error.code = error_codes.SESSION_KEY_ERROR;
                            reject(error);
                        }
                        else
                        {
                            resolve();
                            attach_handlers(socket, {callback: receiveMessage(options.callback), close: options.closeCallback});
                        }
                        break;
                    case init_packet_types.sessionResponse:
                        if(!data.value)
                        {
                            var error = new Error('session keys failed to be set');
                            error.code = error_codes.SESSION_KEY_ERROR;
                            reject(error);
                        }
                        else
                        {
                            resolve();
                            attach_handlers(socket, {callback: receiveMessage(options.callback), close: options.closeCallback});
                        }
                        break;
                }
            }
        }
    });

    return {promise: promise, callback: init};
}

/**
 *  after the connection is set up this is set as the 
 *  data event handler on the TCP socket. It's job
 *  is to decrypt the message then call the user
 *  configured callback with the unencrypted message.
 */
function receiveMessage(callback)
{
    return (data)=>{
        logger.debug('RECIEVED MESSAGE: ' + data);
        var d = JSON.parse(encryption.decrypt('session', data));
        logger.debug('DECRYPTED MESSAGE TO: ');
        logger.debug(d);
        if(callback)
            callback(d);
    }
}

/**
 *  creates a server to listen for incoming connections
 */
function make_server(callback, options)
{
    return () =>
    {
        socket.end();
        socket.destroy();
        server = net.createServer(accept_connection(callback, options.remote_address));
        server.on('error', options.error || console.error);
        server.listen(port);
        console.log("waiting for peer to connect...");
    }
}

/**
 *  a callback for when the server gets a connection request.
 *  this functino just makes sure that the person connecting
 *  has the address that the user was trying to connect to.
 */
function accept_connection(callback, address)
{
    return sock =>
    {
        if(sock.remoteAddress == address || '::ffff:' + sock.remoteAddress)
        {
            socket = sock;
            attach_handlers(sock, {callback: callback});
            if(encryption.isForeignSet())
            {
                verifyKey(); 
            }
            else
            {
                keyRequest();
            }
            server.close();
            server = true;
        }
        else
        {
            sock.end();
            console.error("connection attempt from unknown address: " + sock.remoteAddress);
            console.error("expecting: " + address);
        }
    }
}

/**
 *  This funciton just quickly attaches handlers with
 *  all the events configured to use default handlers.
 *  this way I can remove all handlers then call this function
 *  and not have to attach all of the handlers in each location
 *  that I remove them.
 */
function attach_handlers(sock, options)
{
    if(!options)
        options = {};
    sock.removeAllListeners();
    sock.setEncoding('utf8');
    sock.on('data', options.callback || console.log);
    sock.on('error', options.error || console.error);
    sock.on('end', options.close || default_close_handler);
    if(options.connection)
        sock.on('connection', options.connection);
}

/**
 *  default handler for the connection closed event
 */
function default_close_handler()
{
    console.log('connection has been closed');
}

/**
 *  function that writes the verifyKey request to the peer.
 */
function verifyKey()
{
    var string = Math.random().toString(36).substring(2,15) + Math.random.toString(36).substring(2,15);
    socket.write(JSON.stringify({
        type: init_packet_types.verifyKey, 
        encrypt: encryption.encrypt('foreign', string),
        value: string
    }));
}

/**
 *  function that writes a keyRequest
 *  message to the peer.
 */
function keyRequest()
{
    socket.write(JSON.stringify({type: init_packet_types.keyRequest}));
}

/**
 *  generates a aes key segment then sends it to the
 *  peer.
 */
function sessionSegment()
{
    encryption.generateAESSegment().then((segment)=>{
        segment = encryption.encrypt('foreign', segment);
        socket.write(JSON.stringify({
            type: init_packet_types.sessionSegment,
            key: segment
        }));
    });
}

/**
 *  tells the peer that all of your
 *  rsa keys are ready.
 */
function keysReady()
{
    socket.write(JSON.stringify({
        type: init_packet_types.keysReady
    }));
}

/**
 *  tells the user if they correctly
 *  encrypted a message with your public key.
 *  argument is verifyKey request received
 */
function verifyAnswer(data)
{
    socket.write(JSON.stringify({
        type: init_packet_types.verifyAnswer,
        ans: data.value == encryption.decrypt('private', data.encrypt)
    }));
}

/**
 *  Sends your public key to the peer
 */
function keyAnswer()
{
    socket.write(JSON.stringify({
        type: init_packet_types.key,
        key: encryption.getPublicKey()
    }));
}

/**
 *  generates a random string and then encrypts it with the session
 *  key. then sends that to the peer to test.
 */
function testSessionKey()
{
    var string = Math.random().toString(36).substring(2,15) + Math.random.toString(36).substring(2,15);
    socket.write(JSON.stringify({
        type: init_packet_types.sessionTest,
        value: string,
        encrypt: encryption.encrypt('session', string)
    }));
}

/**
 *  responds if the session key
 *  could correctly decrypt the message
 */
function sessionResponse(ans)
{
    socket.write(JSON.stringify({
        type: init_packet_types.sessionResponse,
        value: ans
    }));
}

module.exports = network;
