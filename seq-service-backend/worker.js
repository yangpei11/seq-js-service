const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');

const moment = require('moment')
var excuteJS = require("./do.js")
var WebHDFS = require('webhdfs')
var UUID = require('uuid')
const fs = require('fs')
  //var ret = excuteJS(workerData)

// var index = workerData["index"]
// var seqJs = workerData["seqJs"]
// var constantArg = workerData["constantArg"]
// var filter = workerData["filter"]
// var output = workerData["output"]
// var arrCol = workerData["arrCol"]
// var outputCol = workerData["outputCol"]
// var stringifyOutput = workerData["stringifyOutput"]
// var keepArrCol = workerData["keepArrCol"]
// var stringifyArrCol = workerData["stringifyArrCol"]
// var pathArg = workerData["pathArg"]

// index is worker index in group (for an single input file)
let {
  queryId, index, seqJs, constantArg, filter, output, arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol, pathArg, input
} = workerData
//arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol

function modifyJsCode3(jsCode){
    return "(function (arg, constantArg){" + jsCode + "})"
}

var modJs = modifyJsCode3(seqJs)
function filterCode(jsCode){
    return "(function (row){" + "return "+ jsCode + "})"
}
var funJs = eval(modJs)

try{
  var funFilter = eval( filterCode(filter) ) 
}
catch(e){
  console.log("FILTER ERROR!")
  console.log(e)
  parentPort.postMessage("FILTER ERROR")
  process.exit()
}
// var constantArg;
try{
  constantArg = JSON.parse(constantArg)
}
catch(e){
  console.log("constantArg error!")
  console.log(e)
  parentPort.postMessage("ConstantArg ERROR")
  process.exit()
}



if(process.env.PROXY_ADDR != undefined){
    proxyAddress = process.env.PROXY_ADDR
}
else{
    proxyAddress = require('./worker_conf.json').proxyAddress
}
var host = proxyAddress.split(":")[0]
var port = proxyAddress.split("/")[0].split(":")[1]
var start = proxyAddress.indexOf("/")
var path = proxyAddress.substr(start+1) + "/webhdfs/v1"

hdfs = WebHDFS.createClient({
    user:'analysis',
    host:host,
    port:port,
    path:path
})
//curl -i -X PUT "http://hd044:8001/webhdfs/v1/user/hive/warehouse/useless/main.js?op=RENAME&user.name=analysis&destination=/user/hive/warehouse/mvFile/hello.js"


const zlib = require('zlib');
const zip = zlib.createGzip();
var remoteFileStream 

fileName = UUID.v1() + ".gz"
let outputFilePath = output +"/"+ fileName
if(fs.existsSync(output) ){
    remoteFileStream = fs.createWriteStream(outputFilePath)
}
else{
  //remoteFileStream = hdfs.createWriteStream(outputFilePath)
  remoteFileStream = hdfs.createWriteStream("/user/hive/warehouse/useless/" + fileName)
}
//remoteFileStream = fs.createWriteStream(output + UUID.v1() + ".gz")
//remoteFileStream.on('error', (err) => {
  //  console.log("777"+err)
   // remoteFileStream = hdfs.createWriteStream(output + UUID.v1() + ".gz")
   // zip.pipe(remoteFileStream)
//});

zip.pipe(remoteFileStream)

remoteFileStream.on('finish', () => {
    console.log("###########################")
    parentPort.postMessage("exit" + fileName);
    process.exit()
});

remoteFileStream.on('error', function onError (err) {
    //On error 
    console.log(err)
 });


console.log(`worker: threadId ${threadId} start with ${__filename}`);
 
let outputCount = 0
let inputCount = 0
parentPort.on('message', msg => {
    if( !(msg instanceof Array)){
        zip.end()
        console.log(`queryId=${queryId} input=${input} workerIndex =${index} inputCount=${inputCount} outputFilePath=${outputFilePath} outputCount=${outputCount}`)
        //parentPort.postMessage("exit");
        //process.exit()
    }
    else{
      for(let i = 0; i < msg.length; i++){
         inputCount ++
         let msgArg
         if(pathArg != -1){
          msgArg = pathArg + ',' + msg[i].substr(1)
         }
         else{
          msgArg = msg[i]
         }
         //console.log(msgArg)
         var ret = excuteJS(msgArg, funJs, constantArg, funFilter , arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol)
         if(ret == 'SEQJS ERROR'){
            //出错了
            parentPort.postMessage("SEQJS ERROR")
            process.exit()
         }
          if(ret == "FILTER ERROR"){
            parentPort.postMessage("FILTER ERROR")
            process.exit()
         } 
         if(ret != 'NOT FILTER' && ret != 'SEQJS ERROR') {
           outputCount ++
           zip.write(ret+'\n')
         }
      }
      parentPort.postMessage(index);
    }
})

// init register to group
parentPort.postMessage(index);

