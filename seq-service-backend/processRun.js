const {
  isMainThread, parentPort, workerData, threadId,
  MessageChannel, MessagePort, Worker
} = require('worker_threads');
var arguments = process.argv.splice(2);
//hdfs_file_name = ["1.gz", "2.gz", "3.gz", "4.gz"]
var hdfs_file_name = arguments
var groupNumber = hdfs_file_name.length;
console.log(hdfs_file_name)

var fininsh = 0

console.time("time")
for(let i = 0; i < groupNumber; i++){
    const worker = new Worker("./groupThread.js", {workerData: "/tmp/analysis/tmp_for_yangpei/"+hdfs_file_name[i]})
    worker.on('exit', code => { 
        fininsh++
        console.log(fininsh + ":fininshed")
    if(fininsh==groupNumber){
        console.timeEnd("time")
        }
    });
}
