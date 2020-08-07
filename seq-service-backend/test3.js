const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');
var excuteJS = require("./do.js")

function mainThread(){
  var data = []
  for(let i = 0; i < 2000; i++){
    data.push('{"first_day":"2016-06-01","uid":"863562029396301","vendor":"baidu","vendor_expand":"baidu","arr":"[{\\"action\\":\\"访问\\",\\"ts\\":1464710400000,\\"day\\":\\"2016-06-01\\",\\"vendor\\":\\"baidu\\",\\"prio\\":2}]"}')
  }
  console.time("time")
  var cnt = 20
  for(let i = 0; i < 20; i++){
      const worker = new Worker(__filename, {workerData:data});
      
      worker.on('exit', code => {
 //       console.log("exit") 
        cnt = cnt - 1;
        if(cnt == 0){
          console.timeEnd("time")
        }
      });
  }
}
 
function workerThread() {
//  console.log(`worker: threadId ${threadId} start`);
  //console.log(`worker: workerDate`);
  for(let i = 0; i < workerData.length; i++){
      var ret = excuteJS(workerData[i])
  }
}
 
if (isMainThread) {
  mainThread();
} else {
  workerThread();
}
