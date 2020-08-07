const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');
 
function mainThread() {
  const worker = new Worker(__filename, { workerData:{data:"ABBdsafsafsafsafsafjsfjksabjhfdbfafabjhffsffafsfbkf", seq:0}});
  worker.on('exit', code => { console.log(`main: worker stopped with exit code ${code}`); });
  worker.on('message', msg => {
    //console.log(`main: receive ${msg.seq}`);
    msg.seq = msg.seq + 1
    msg.data = msg.data + msg.seq
    worker.postMessage(msg);
  });
}
 
function workerThread() {
  console.log(`worker: threadId ${threadId} start with ${__filename}`);
  console.log(`worker: workerDate ${workerData}`);
  console.time("time")
  parentPort.on('message', msg => {
   // console.log(`worker: receive ${msg.seq}`);
    if (msg.seq >= 3000) {
      console.timeEnd("time") 
      process.exit(); }
    msg.seq = msg.seq + 1
    msg.data = msg.data + msg.seq
    parentPort.postMessage(msg);
  }),
  parentPort.postMessage(workerData);
}
 
if (isMainThread) {
  mainThread();
} else {
  workerThread();
}
