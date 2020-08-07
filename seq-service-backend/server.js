const childProcess = require('child_process')

const maxProcessNumber = 4
var availableNumber = 4
console.time("time")
var hdfs_name = ['1.gz', '2.gz', '3.gz', '4.gz']
for(let i = 0; i < maxProcessNumber; i++){
    const worker = childProcess.fork('./groupThread.js', ["/tmp/analysis/tmp_for_yangpei/" + hdfs_name[i] ])
    worker.send("/tmp/analysis/tmp_for_yangpei/"+hdfs_name[i])
    availableNumber--;
    worker.on("exit", (msg) => {
        availableNumber++;
        if(availableNumber==maxProcessNumber){
            console.timeEnd("time")
            process.exit()
        }
    })
   // console.log(availableNumber)
}
