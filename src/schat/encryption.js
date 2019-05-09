const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { error_codes } = require("./constants.js");
const encryption = {};

const key_length = 32;
var schat_dir = path.resolve(os.homedir(), '.schat');
var private_key_file = path.join(schat_dir, '/priv_key');
var public_key_file = path.join(schat_dir, '/pub_key');
var foreign_key_file = path.join(schat_dir, '/foriegn_keys');
var private_key, public_key, foreign_key;
var session_key = '';
var cipher, decipher;
var foreign_set = false;
var save_foreign = false;
var session_set = false;

/**
 *  This function can be called with an optional
 *  argument that contains optional alternative file
 *  paths for the 3 different keys. If a path is not 
 *  set then a default path will be attempted. 
 *  returns a Promise that will resolve with an array 
 *  of errors loading files if any occur.
 */
encryption.setKeys= function(keys)
{
    var dir_check, local, foreign;
    if(!keys)
        keys = {};

    if(keys.priv)
        keys.priv = path.resolve(keys.priv);
    else
        keys.priv = private_key_file;

    if(keys.pub)
        keys.pub = path.resolve(keys.pub);
    else
        keys.pub = public_key_file;

    if(keys.fpub)
        keys.fpub = path.resolve(keys.fpub);
    else
        keys.fpub = foreign_key_file;

    dir_check = check_directory();

    local = dir_check
    .then(initPrivateKey(keys.priv))
    .then(initPublicKey(keys.pub));

    foreign = dir_check
    .then(initForeignKeys(keys.fpub));

    return Promise.all([local, foreign]);
}

/**
 *  This function generates a public and private
 *  RSA key pair to be used for the current local 
 *  key pair.
 */
encryption.generateKeys = function()
{
    return new Promise((resolve, reject)=>
    {
        crypto.generateKeyPair('rsa', {modulusLength: 2048}, (err, pub, priv)=>
        {
            if(err)
            {
                reject(err);
                return;
            }
            private_key = priv;
            public_key = pub;
            resolve();
        })
    });
}

/**
 *  This functin is a generates public and private keys
 *  and then saves them to either the default file path or 
 *  the path provided in the optional argument
 */
encryption.generateKeysAndSave = (paths) =>
{
    if(!paths)
        paths = {};
    if(!paths.priv)
        paths.priv = private_key_file;
    if(!paths.pub)
        paths.pub = public_key_file;

    return new Promise((resolve, reject) =>
    {
        return encryption.generateKeys()
            .then(() =>
            {
                return encryption.saveKeys(paths);
            });
    });
}

/**
 *  This function will save the currently loaded local
 *  keys and set up the foreign key to be saved 
 *  after it has been received over the network connection.
 */
encryption.saveKeys = (paths) =>
{
    var priv, pub, fpub;
    if(paths.priv === true)
        priv = private_key_file;
    else if (paths.priv)
        priv = path.resolve(paths.priv);

    if(paths.pub === true)
        pub = public_key_file;
    else if(paths.pub)
        pub = path.resolve(paths.pub);

    if(paths.fpub === true)
        save_foreign = true;
    else if(paths.fpub)
    {
        foreign_key_file = path.resolve(paths.fpub);
        save_foreign = true;
    }

    return check_directory().then(()=>
    {
        var promises = [];
        if(pub)
            promises.push(writeFile(pub, public_key.export({type:'pkcs1', format: 'pem'})));
        if(priv)
            promises.push(writeFile(priv, private_key.export({type:'pkcs1', format: 'pem'})));
        return Promise.all(promises);
            
    }).catch((err)=>
    {
        console.error("Error saving key files: " + err);
    });
}

/**
 *  returns if the session key is ready to be transformed into an actual 
 *  cipher object.
 */
encryption.isSessionSet = function()
{
    return session_key != undefined && session_key.length==24;
}

/**
 *  sets the foreign key and if configured saves it
 *  to a file.
 */
encryption.setForeignKey = function(keyString)
{
    foreign_key = crypto.createPublicKey(keyString);
    foreign_set = true;
    if(save_foreign)
    {
        writeFile(foreign_key_file, foreign_key.export({type:'pkcs1', format: 'pem'})).catch((err)=>
        {
            console.error("Error saving Foreign Key file: ", err);
        });
    }
}

/**
 *  returns true if the foreign key has been set,
 *  and false if it has not been
 */
encryption.isForeignSet = function()
{
    return foreign_set;
}

/**
 *  gets the public key string for sending
 *  over the network.
 */
encryption.getPublicKey = function()
{
    return public_key.export({type: 'pkcs1', format:'pem'});
}

/**
 *  sets a section of the session key and then creates the cipher
 *  if both sections have been set.
 */
encryption.setSessionSegment = function(segment)
{
    var ready = false, buffer;
    session_key += segment;
    //because hex conversion doubles length
    ready = session_key.length >= key_length * 2;
    if(ready)
        createCiphers();
    return ready;
}

/**
 *  creates a half of an AES key.
 *  returns the half as a string
 */
encryption.generateAESSegment = function()
{
    return new Promise((resolve,reject)=>{
        crypto.randomBytes(key_length/2, (err, buffer)=>{
            if(err)
                reject(err);
            else
            {
                var string = buffer.toString('hex');
                session_key += string;
                if(session_key.length >= key_length * 2)
                    createCiphers();
                resolve(string);
            }
        });
    });
}

/**
 *  encrypts a given message with either the
 *  private, public, foreign, or session key
 *  based on the type arguement. returns the
 *  encrypted string/Buffer
 */
encryption.encrypt = function(type, message)
{
    var ans, buffer = Buffer.from(message);
    switch(type)
    {
        case 'public':
            ans = crypto.publicEncrypt(public_key, buffer);
            return ans.toString('base64');
            break;
        case 'private':
            ans = crypto.privateEncrypt(private_key, buffer);
            return ans.toString("base64");
            break;
        case 'foreign':
            ans = crypto.publicEncrypt(foreign_key, buffer);
            return ans.toString("base64");
            break;
        case 'session':
            createCiphers();
            ans = cipher.update(message, 'utf8', 'hex') + cipher.final('hex');
            return ans;
            break;
        default:
            throw new Error('encryption of type ' + type + ' is not supported');
    }
}

/**
 *  Decrypts a given message with either the
 *  private, public, foreign, or session key
 *  based on the type arguement. returns the
 *  unencrypted string/Buffer.
 */
encryption.decrypt = function(type, message)
{
    var ans, buffer;
    switch(type)
    {
        case 'public':
            buffer = Buffer.from(message, 'base64');
            ans = crypto.publicDecrypt(public_key, buffer);
            return ans.toString('utf8');
            break;
        case 'private':
            buffer = Buffer.from(message, 'base64');
            ans = crypto.privateDecrypt(private_key, buffer);
            return ans.toString('utf8');
            break;
        case 'foreign':
            buffer = Buffer.from(message, 'base64');
            ans = crypto.publicDecrypt(foreign_key, buffer);
            return ans.toString('utf8');
            break;
        case 'session':
            createCiphers();
            ans = decipher.update(message, 'hex', 'utf8') + decipher.final('utf8');
            return ans;
            break;
        default:
            throw Error('decryption of type ' + type + ' is not supported');
    }
}

/**
 *  promise that starts off the operations for loading in the
 *  key files. Must make sure that the directory ~/.schat exist
 *  and is a directory if its not then the rest will fail.
 */
function check_directory()
{
    return new Promise((resolve, reject)=>
    {
        fs.stat(schat_dir, (err, stats)=>
        {
            if(err && err.code == 'ENOENT')
            {
                fs.mkdir(schat_dir, (err)=>
                {
                    if(err)
                    {
                        err.code = error_codes.DIRECTORY_ERROR;
                        reject(err);
                    }
                    else
                        resolve();
                });
            }
            else if(!stats.isDirectory())
            {
                var err = new Error("file ~/.schat already exist and is not a directory");
                err.code = error_codes.DIRECTORY_ERROR;
                reject(err);
            }
            else
                resolve();
        });
    });
}

/**
 *  creates a new cipher and decipher to be used
 *  with the aes key.
 */
function createCiphers()
{
    buffer = Buffer.from(session_key, 'hex');
    cipher = crypto.createCipheriv('aes-256-ctr', buffer, Buffer.alloc(16, 0));
    decipher = crypto.createDecipheriv('aes-256-ctr', buffer, Buffer.alloc(16, 0));
}

/**
 *  attempts to read the private key and save the resulting 
 *  key object in a global variable.
 */
function initPrivateKey(path)
{
    return ()=>
    {
        return readFile(path)
        .then( res =>
        {
            private_key = crypto.createPrivateKey(res); 
        })
        .catch(err=>
        {
            err.code = error_codes.LOCAL_KEY_ERROR;
            return err;
        });
    }
}

/**
 *  attempts to read the public key file and save the resulting
 *  key object in a global variable.
 */
function initPublicKey(path)
{
    return (err)=>
    {
        if(err)
            return err;
        return readFile(path)
        .then( res =>
        {
            public_key = crypto.createPublicKey(res);
        })
        .catch(err=>
        {
            err.code = error_codes.LOCAL_KEY_ERROR;
            return err;
        });
    }
}

/**
 *  attempts to read the foreign key from a file
 *  and save the resulting key object in a global
 *  variable.
 */
function initForeignKeys(path)
{
    return ()=>
    {
        return readFile(path)
        .then( res =>
        {
            foreign_key = crypto.createPublicKey(res); 
            foreign_set = true;
        })
        .catch(err=>
        {
            err.code = error_codes.FOREIGN_KEY_ERROR;
            return err;
        });
    }
}

/**
 *  writes a string/buffer to a file path.
 *  returns a promise throws a rejection
 *  when the fs function callback has
 *  an error.
 */
function writeFile(path, data)
{
    return new Promise((resolve, reject)=>
    {
        fs.writeFile(path, data, (err)=>
        {
            if(err)
                reject(err);
            else
                resolve();
        });
    });
}

/**
 *  reads the passed in file path.
 *  basically just a promise translation
 *  for the fs function.
 */
function readFile(path)
{
    return new Promise((resolve, reject)=>
    {
        fs.readFile(path, (err, data)=>
        {
            if(err)
                reject(err);
            else
                resolve(data);
        });
    });
}

module.exports = encryption;
