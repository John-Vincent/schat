var encryption = require('./encryption.js');


encryption.setKeys().then((res)=>
{
    console.log("log", res);
}).catch((err)=>{
    console.error("error", err);
});
