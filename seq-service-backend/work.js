const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');

var excuteJS = require("./do.js")
  //var ret = excuteJS(workerData)

console.log(`worker: threadId ${threadId} start with ${__filename}`); 

parentPort.on('message', msg => {
   // console.log(`worker: receive ${msg.seq}`);
    if( !(msg instanceof Array)){
        process.exit()
    }
    /*
    for(let i = 0; i < msg.length; i++){
       var ret = excuteJS(msg[i])
    }*/
    console.log(msg)
    parentPort.postMessage(threadId-1);
  }),
  parentPort.postMessage(threadId-1);
}