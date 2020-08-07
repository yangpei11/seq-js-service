const {
 	 isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');
//console.log(process.argv[2])
// var file_name = process.argv[2]
// var subTaskId = process.argv[3]
// var seqJs = process.argv[4]
// var constantArg = process.argv[5]
// var filter = process.argv[6]
// var output = process.argv[7]
// var arrCol = process.argv[8]
// var outputCol = process.argv[9]
// var stringifyOutput = process.argv[10]
// var keepArrCol = process.argv[11]
// var stringifyArrCol = process.argv[12]
// var pathArg = process.argv[13]
var fs = require('fs')
let processParamObj = JSON.parse(fs.readFileSync(process.argv[2]))

let {queryId, input, subTaskId, seqJs, constantArg, filter, output, arrCol,
outputCol, stringifyOutput, keepArrCol, stringifyArrCol, pathArg} = processParamObj

// 参数
//arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol

// var workerThreadsNumber = 6; 
var workerThreadsNumber = 1; 
var maxPendingBatch = 100;
var backpressureSleepMillis = 1000;

var end = false
var WebHDFS = require('webhdfs')
var fs = require('fs')
var zlib = require('zlib')
let split = require('split')
// var byline = require('byline')
//hdfs_file_name = workerData
 // hdfs_file_name = "/tmp/analysis/tmp_for_yangpei/example1.gz"
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
//console.log(workerData)
var remoteFileStream 
var unzip = zlib.createGunzip();
var stream

if(input.substr(0, 4) == "file"){
    remoteFileStream = fs.createReadStream( input.replace("file:/", ".") )
}
else{
    remoteFileStream = hdfs.createReadStream( input )
}
/*
remoteFileStream = fs.createReadStream( input )
remoteFileStream.on('error', (err) => {
    remoteFileStream = hdfs.createReadStream( input )
    stream = remoteFileStream.pipe(unzip).pipe(split())
});*/

stream = remoteFileStream.pipe(unzip).pipe(split())
var workers = []
var readyThreadQueue = []
var readyData = []
var outputFile = []
var exitThreadNum = 0
process.on('message', (msg) => {
  console.log('[Worker] Received message from master: ' + msg)
  //process.send('Hi master.')
})
//console.log("start")
for(let i = 0; i < workerThreadsNumber; i++){
    const worker = new Worker('./worker.js', {workerData:{
         queryId, index:i, seqJs, constantArg, filter,
         output, arrCol, outputCol,
         stringifyOutput, keepArrCol,
         stringifyArrCol, pathArg,
         input}});
   worker.on("error", msg=>{ console.log(msg)})
    worker.on('exit', code => { console.log(`main: worker stopped with exit code ${code}`); });
    worker.on('message', msg => {
     
     //一旦子线程报错，结束进程组
     if(msg == 'SEQJS ERROR' || msg == 'ConstantArg ERROR' || msg == 'FILTER ERROR'){
        process.send({status:msg, subTaskId:subTaskId})
        process.exit()
     }    
     if( typeof(msg) == "string" && msg.substr(0, 4) == "exit"){
        exitThreadNum ++
        outputFile.push(msg.substr(4))
        if(exitThreadNum == workerThreadsNumber){
            console.log(`all worker threads exited for queryId=${queryId} input=${input} at ${Date.now()}`)
            process.send({status:"OK", subTaskId:subTaskId, fileName:outputFile})
            process.exit()
        }
     }
     if(readyData.length != 0){
        worker.postMessage(readyData.shift())
     }
     else{
        readyThreadQueue.push(msg)
        if(end && readyThreadQueue.length == workers.length){
            console.log(`groupThread announcing exit for queryId=${queryId} input=${input} at ${Date.now()}`)
            for(let i = 0; i < readyThreadQueue.length; i++){
                 workers[ readyThreadQueue[i]].postMessage("exit")
            }
	   // console.log("game over")
	        //process.send(subTaskId) 
            //process.send({status:"OK", subTaskId:subTaskId})
            //process.exit()
        }
     }
    });
    workers.push(worker)
}

var cnt = 0;
var buf =[]
var lineCount = 0
stream.on('data', function(line){
   
    // 临时测试
    // if (line.indexOf('cd6d6572-6f93-4e50-8c21-c0f9ba1999ad') >= 0) {
    //  console.log(`special debug from input ${input} : ${line}`)
    // }
    
    // console.log(`line from input ${input} : ${line} EOL`)
    // try{
    //  JSON.parse(line)
    // }catch(e){
    //  console.log(`cannot parse line ${lineCount} from input ${input} : ${line} EOL`)
    // }

     /*
     if(lineCount%10000 == 0){
    console.timeEnd("time")
        console.log(lineCount)
        console.time("time")   
     }
     if(lineCount ==4949000){
        console.timeEnd("allTime")
     }*/
     // console.log(readyData.length)

    // 换成split后，最后会产生一个空行。跳过它。
    if (line == '') {
      cnt++
      lineCount++
      return;
    }
    buf.push(line)
    if(cnt == 100){
       // console.log(readyData.length)
        cnt = 0
        if(readyThreadQueue.length != 0){
            workers[readyThreadQueue.shift()].postMessage(buf)
        }
        else{
            readyData.push(buf)
        }
        buf =[]
    }
    if(readyData.length > maxPendingBatch){
	//console.log("!!!!!!!!!!!!!")
        stream.pause();
       // console.log(threadId +" pause: length=" + readyData.length)
        setTimeout(() => {
         //   console.log(threadId + " resume: length=" + readyData.length)
            stream.resume();
        }, backpressureSleepMillis);  
    }
})

stream.on('end', function() {
    end = true
    if(buf.length != 0){
        if(readyThreadQueue.length != 0){
            workers[readyThreadQueue.shift()].postMessage(buf)
        }
        else{
            readyData.push(buf)
        }
    } 
      //done();
});
