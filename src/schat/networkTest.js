process.env.LOG_MODE = 'debug';

var network = require('./network.js');
var encryption = require('./encryption.js');
var options = {local_port:4567, remote_port: 5678, remote_address: 'localhost', callback: console.log, closeCallback: ()=>{console.log('peer disconnected');}};

//if there is a command line arg besides node and file name then with second port config
if(process.argv.length > 2)
{
    options.local_port = 5678;
    options.remote_port = 4567;
}

encryption.generateKeys().then(()=>{
    return network.open(options).then((a, err)=>{console.log('hi', a, err);});
}).then(()=>{
    network.send({a: 'message'});
}).catch(console.error);
