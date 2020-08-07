const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');
 
function mainThread() {
  var WebHDFS = require('webhdfs')
  var fs = require('fs')
  var zlib = require('zlib')
  var byline = require('byline')
  hdfs_file_name = "/tmp/analysis/tmp_for_yangpei/tmp_test_mdc_gz_json/000017_0.gz"
 // hdfs_file_name = "/tmp/analysis/tmp_for_yangpei/example1.gz"
  hdfs = WebHDFS.createClient({
      user:'analysis',
      host:'hd044',
      port:'8001',
      path:'webhdfs/v1'
  })
  var remoteFileStream = hdfs.createReadStream( hdfs_file_name )
  var unzip = zlib.createGunzip();
  var stream = byline.createStream( remoteFileStream.pipe(unzip) )
  var workers = []
  var readyThreadQueue = []
  var readyData = []
  for(let i = 0; i < 5; i++){
    const worker = new Worker(__filename, {workerData:"0"});
    worker.on('exit', code => { console.log(`main: worker stopped with exit code ${code}`); });
    worker.on('message', msg => {
     //console.log(`main: receive ${msg.seq}`);
      //msg.seq = msg.seq + 1
     // msg.data = msg.data + msg.seq
     // worker.postMessage(msg);
     //msg代表第几个线程
     //readyThreadQueue.push(msg)
     if(readyData.length != 0){
        worker.postMessage(readyData.shift())
     }
     else{
      readyThreadQueue.push(msg)
     }
    });
    workers.push(worker)
  }

  var cnt = 0;
  var buf =[]
  var lineCount = 0
  console.time("time")
  console.time("allTime")
  stream.on('data', function(line){
      cnt++
      lineCount++
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
      buf.push(line.toString())
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
    if(readyData.length > 50){
        stream.pause();
       // console.log("pause: length=" + readyData.length)
        setTimeout(() => {
         // console.log("resume: length=" + readyData.length)
          stream.resume();
        }, 100);  
    }
  })

  stream.on('end', function() {
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
}
 
function workerThread(){
  var excuteJS = require("./do.js")
  //var ret = excuteJS(workerData)

  console.log(`worker: threadId ${threadId} start with ${__filename}`);
 // console.log(`worker: workerDate ${workerData}`);
  //console.time("time")
  parentPort.on('message', msg => {
   // console.log(`worker: receive ${msg.seq}`);
   for(let i = 0; i < msg.length; i++){
       var ret = excuteJS(msg[i])
  }
   //console.log(msg)
    parentPort.postMessage(threadId-1);
  }),
  parentPort.postMessage(threadId-1);
}
 
if (isMainThread) {
  mainThread();
} else {
  workerThread();
}

//[1-7][0-9]{0-3}|8000|9[0-9]{0-2}
