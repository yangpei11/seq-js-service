var express = require('express')
var bodyParser  = require('body-parser')
var app = express()
var fs = require('fs')
var request = require('request')
var UUID = require('uuid')
var getHdfsDir = require('./readHdfsDir.js')
var schedule = require('node-schedule')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var freeWorkerList = []
var pendingQueryList = []
var timeMap = {}
var queryIdToSubtaskId = {}
var idToDesc = {}
var taskIDtoIP = {}
var IPtoTaskID = {}
var subTaskIdToFilename = {}
var subTaskIdToInput = {}
var queryIdFinish = {} //
var subTaskIdToQueryID = {}

var proxyAddress
if(process.env.PROXY_ADDR != undefined){
    proxyAddress = process.env.PROXY_ADDR
}
else{
    proxyAddress = require('./worker_conf.json').proxyAddress
}

var tmpDir
if(process.env.tmpDir != undefined){
    tmpDir = process.env.tmpDir
}
else{
    tmpDir = require('./worker_conf.json').tmpDir
}

//只保存24小时内的任务
function clearTask(){
    for(let queryId in queryIdToSubtaskId){
        //console.log("key:" + key + " value:" + a[key])
        let nowTime = new Date().getTime()
        var maxFinishTime = -1
        var maxFailTime = -1
        var subTaskIds = []
        var cnt = queryIdToSubtaskId[queryId].length //子任务数
        for(let i = 0; i < queryIdToSubtaskId[queryId].length; i++){
            subTaskIds.push(queryIdToSubtaskId[queryId][i])
            if(timeMap[queryIdToSubtaskId[queryId][i]].finishTime != undefined){
                cnt--;
                if(timeMap[queryIdToSubtaskId[queryId][i]].finishTime > maxFinishTime){
                    maxFinishTime = timeMap[queryIdToSubtaskId[queryId][i]].finishTime
                }
            }
            else if(timeMap[queryIdToSubtaskId[queryId][i]].failTime != undefined){
                cnt--
                if(timeMap[queryIdToSubtaskId[queryId][i]].failTime > maxFailTime){
                    maxFailTime = timeMap[queryIdToSubtaskId[queryId][i]].failTime
                }
            }
        }
        var endTime = -1;
        if(maxFinishTime != -1){
            endTime = maxFinishTime
        }
        else{
            endTime = maxFailTime
        }
        //已完成或者失败
        if(cnt == 0){
            //大于24小时
            if(nowTime - endTime >= 86400000){
                //先删除timeMap
                for(let i = 0; i < subTaskIds; i++){
                    delete timeMap[subTaskIds[i] ]
                    delete idToDesc[ subTaskIds[i] ]
                    delete taskIDtoIP[ subTaskIds[i] ]
                    delete subTaskIdToFilename[ subTaskIds[i] ]
                }
                delete idToDesc[queryId]
                delete queryIdToSubtaskId[queryId]
            }
        }
    }
}

function getIdleProcessNumber(url) {
    return new Promise( function(resolve, reject) {
        request.post({url:url, form:{}}, 
            function(error, response, body){
                console.log(url)
                if(error){
                    resolve(0)
                }
                console.log(body)
                resolve(JSON.parse(body).availableNumber)
        })
   })
}

function fileExist(url){
    return new Promise(
                        function(resolve, reject) {request(
                                    {
                                        method:'GET',
                                        url:url
                        //url:"http://hd044:8001/webhdfs/v1/user/hive/warehouse/mvFile/hello.js?op=RENAME&user.name=analysis&destination=/user/hive/warehouse/useless/main.js"
                                    },
                                    function(error, response, body){
                                        if(response.statusCode == 200){
                                            resolve("exist")
                                        }
                                        else{
                                            resolve("not exist")
                                        }
                                    }
                        )}
                    )
}

function submitForWorker(url, task){
    return new Promise( function(resolve, reject) {
        request.post({url:url, form:{
                                "queryId": task.queryId,
                                "subTaskId":task.subTaskId,
                                "input":task.path,
                                "output":task.output,
                                "seqJs": task.seqJs,
                                "constantArg":task.constantArg,
                                "filter":task.filter,
                                //arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol
                                "arrCol":task.arrCol,
                                "outputCol":task.outputCol,
                                "stringifyOutput":task.stringifyOutput,
                                "keepArrCol":task.keepArrCol,
                                "stringifyArrCol":task.stringifyArrCol
                        }}, function(error, response, body) {
                            if(error){
                                console.log(`submit error queryId=${task.queryId} subTaskId=${task.subTaskId} input=${task.input}`)
                                resolve({
                                    status: 'FAIL'
                                })
                            } else {
                                try{
                                    let retObj = JSON.parse(body)
                                    var availableNumber = retObj.availableNumber
                                    let status = retObj.status
                                    if (status === 'OK') {
                                        console.log(`submit succeeded availableNumber=${availableNumber} queryId=${task.queryId} subTaskId=${task.subTaskId} input=${task.input}`)
                                    } else {
                                        console.log(`submit failed availableNumber=${availableNumber} queryId=${task.queryId} subTaskId=${task.subTaskId} input=${task.input}`)
                                    }
                                    resolve(retObj)
                                }
                                catch(e){
                                    console.log(`submit failed error=${e} queryId=${task.queryId} subTaskId=${task.subTaskId} input=${task.input}`)
                                    resolve({
                                        status: 'FAIL'
                                    })
                                }
                            }

        })
   })
}


function pushToFreeWorkerListIncrease(IP){
    var flag = false
    for(let i = 0; i < freeWorkerList.length; i++){
        if(freeWorkerList[i].IP == IP){
            flag = true
            freeWorkerList[i].availableNumber ++
        }
    }

    if(!flag){
        freeWorkerList.push({availableNumber:1, IP:IP})
    }
}

function pushToFreeWorkerList(IP, availableNumber, workerName, port, maxNumber){
    var flag = false
    for(let i = 0; i < freeWorkerList.length; i++){
        if(freeWorkerList[i].IP == IP && freeWorkerList[i].port == port){
            flag = true
            freeWorkerList[i].availableNumber = availableNumber
            break
        }
    }

    if(!flag){
        freeWorkerList.push({availableNumber:availableNumber, IP:IP, port:port, workerName:workerName, maxNumber:maxNumber})
    }
}

async function pushToPendingQueryList(input, output, seqJs, constantArg, filter, arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol){
    var files = []
    try{
        inputDirs = JSON.parse(input)
        console.log(inputDirs)
        for(let i = 0; i < inputDirs.length; i++){
            console.log(inputDirs[i])
        }
        for(let i = 0; i < inputDirs.length; i++){
            let tmp 
            try{
                tmp = fs.readdirSync(inputDirs[i])
                for(let j = 0; j < tmp.length; j++){
                    tmp[j] =inputDirs[i] + '/' + tmp[j]
                }
            }
            catch(e){
                tmp = await getHdfsDir(inputDirs[i])
                if(tmp != undefined){
                    for(let j = 0; j < tmp.length; j++){
                        tmp[j] =inputDirs[i] + '/' + tmp[j]
                    }
                }
            }
            if(tmp != undefined){
               files =  files.concat(tmp)
            }
        }
    }
    catch(e){
        let tmp
        console.log("error")
        try{
            tmp = fs.readdirSync(input)
            for(let j = 0; j < tmp.length; j++){
                tmp[j] =input + '/' + tmp[j]
            }
        }
        catch{
            tmp = await getHdfsDir(input)
            if(tmp != undefined){
                for(let j = 0; j < tmp.length; j++){
                    tmp[j] =input + '/' + tmp[j]
                }
            }
        }
        if(tmp != undefined){
           files = files.concat(tmp)
        }
    }
   // console.log(files)
    if(files.length == 0){
       return "NO THIS DIR"
    }
    let startTime = new Date().getTime()
 //   console.log(files.length)
    var queryId = UUID.v1()
    idToDesc[queryId] = {"input":input, "output":output, "seqJs":seqJs, "constantArg":constantArg, "filter":filter}
    var subTaskIdArray = []
    for(let i = 0; i < files.length; i++){
        // var prefix = Number(files[i].split("-").pop().split(".")[0]).toString()
        var prefix = i + ''
        var subTaskId = prefix + "_" + UUID.v1()
	    subTaskIdToInput[subTaskId] = files[i].split("/").pop()
        subTaskIdArray.push(subTaskId)
        timeMap[subTaskId] = {startTime:startTime}
        pendingQueryList.push({path:files[i], queryId:queryId, subTaskId:subTaskId, output:output, seqJs:seqJs, constantArg:constantArg, filter:filter, startTime:startTime, arrCol:arrCol, outputCol:outputCol, stringifyOutput:stringifyOutput, keepArrCol:keepArrCol, stringifyArrCol:stringifyArrCol}) 
        idToDesc[subTaskId] = {"input":input, "output":output, "seqJs":seqJs, "constantArg":constantArg, "filter":filter}
        subTaskIdToQueryID[subTaskId] = queryId
    }
    queryIdToSubtaskId[queryId] = subTaskIdArray
    return {queryId:queryId, subTaskIdArray:subTaskIdArray}
}

async function jobScheduling(){
    while(pendingQueryList.length && freeWorkerList.length){
        let runTime = new Date().getTime()
        var task = pendingQueryList.shift()
        var worker = freeWorkerList[0]
 
        worker.availableNumber--
        if(worker.availableNumber == 0) {
            freeWorkerList.shift()
        }
        

        var retObj = await submitForWorker("http://" + worker.IP+":"+ worker.port +"/api/run-seqjs", task)
        //如果任务成功执行
        if(retObj.status !== 'OK') {
            // 失败
            console.log(`schedule失败 retObj=${JSON.stringify(retObj)} queryId=${task.queryId} subTaskId=${task.subTaskId}`)
            pendingQueryList.unshift(task)
            // pushToFreeWorkerListIncrease(worker.IP)
        } else {
            // 成功
            console.log(`schedule成功  retObj=${JSON.stringify(retObj)} queryId=${task.queryId} subTaskId=${task.subTaskId}`)
            taskIDtoIP[task.subTaskId] = worker.IP + ":" + worker.port
            timeMap[task.subTaskId]["runTime"] = runTime
            if(IPtoTaskID[worker.IP + ":" + worker.port] == undefined){
                IPtoTaskID[worker.IP + ":" + worker.port] = [task.subTaskId]
            }
            else{
                IPtoTaskID[worker.IP + ":" + worker.port].push(task.subTaskId)
            }
        }

        //如果主机访问错误或者可用进程数没有
        // if(ava == 0 || ava == -1){
        //     freeWorkerList.shift()
        // }
        
    }
}

app.get('/api/workers',async function(req,res){
    // if(freeWorkerList.length){
    //     for (worker in freeWorkerList){
    //         console.log(worker.IP)
    //         var worker_ava=await getIdleProcessNumber("http://"+ worker.IP+":4321/api/getIdleProcessNumber")
    //         if(worker_ava<=-1)worker_ava=0
    //         result.push("{ workerIP:"+worker.IP+",avaNumber:"+worker_ava+"}");
    //     }
    // }
    res.send({"numOfWorkers": freeWorkerList.length,"workerList":freeWorkerList})
})

app.post('/api/viewReadyTask', async function(req, res){
    res.send({"status":"OK", "task": pendingQueryList})
})

app.post('/api/viewReadyWorker', async function(req, res){
    res.send({"status":"OK", "worker": freeWorkerList})
})

async function moveFile(queryId){
    for(let i = 0; i < queryIdToSubtaskId[queryId].length; i++){
	//console.log(queryIdToSubtaskId[queryId][i])
	//console.log("subtaskId: " + subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ])
        if( subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ] == undefined){
		console.log("undefined error")
		console.log( queryIdToSubtaskId[queryId][i] )
                        continue
                }
        let trueOutput = []
        for(let j = 0; j < subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ].length; j++){
            let filename = subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ][j]
            let output = idToDesc[queryId]["output"]
            //"hd066:8445/gateway/eadhadoop/hdfs"
	    //let url ="http://hd044:8001/webhdfs/v1/user/hive/warehouse/useless/" + filename +"?op=GETFILESTATUS"
	    //let url = "http://hd066:8445/gateway/eadhadoop/hdfs/webhdfs/v1/user/hive/warehouse/useless/" + filename +"?op=GETFILESTATUS"
        let url = "http://"+ proxyAddress +"/webhdfs/v1/" + tmpDir +"/" + filename +"?op=GETFILESTATUS"
	    let isExist = await fileExist(url)
	    if(isExist == "not exist"){
		console.log("###" + filename + "###")
		continue
	    }
            trueOutput.push(filename)
            request(
                    {
                        method:'PUT',
                        url:"http://"+ proxyAddress+"/webhdfs/v1/" + tmpDir +"/" + filename +"?op=RENAME&user.name=analysis&destination="+ output + "/"+ filename
                       // url:"http://hd044:8001/webhdfs/v1/user/hive/warehouse/useless/" + filename +"?op=RENAME&user.name=analysis&destination="+ output + "/"+ filename
                        //url:"http://hd044:8001/webhdfs/v1/user/hive/warehouse/mvFile/hello.js?op=RENAME&user.name=analysis&destination=/user/hive/warehouse/useless/main.js"
                    },
                    function(error, response, body){
                        if(response.statusCode == 200){
                            console.log("success")
                        }
                        else{
                            console.log("error")
                        }
                    }
            )

        }
        subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ] = trueOutput
    }
}
///curl -i -X PUT "http://hd044:8001/webhdfs/v1/user/hive/warehouse/useless/c60d1500-99c3-11ea-8334-f9d261b7d14f.gz?op=RENAME&user.name=analysis&destination=/user/hive/warehouse/temp.db/tmp_seqjs_yangfch_json_arr_part_1589870394432/e.gz"
//                 http://hd044:8001/webhdfs/v1/user/hive/warehouse/useless/ec21c840-99c7-11ea-9032-6d028b11b360.gz?op=RENAME&user.name=analysis&destination=/user/hive/warehouse/temp.db/tmp_seqjs_yangfch_json_arr_/ec21c840-99c7-11ea-9032-6d028b11b360.gz
app.post('/api/register', async function(req, res){
    let ts = new Date().getTime();
    console.log("register ts=" + ts)
    var availableNumber = req.body.avaProNum
    var clientIp = req.body.IP
    var msg = req.body.msg
    var workerName = req.body.NAME 
    var port = req.body.PORT
    var maxNumber = req.body.maxNumber
    try{
        if(msg != undefined){
            msg  = JSON.parse(msg)
            let tasks = IPtoTaskID[clientIp + ':' + port]
            for(let i = 0; i < msg.length; i++){
                if(msg[i]["status"] == "OK"){
                    timeMap[ msg[i]["subTaskId"] ]["finishTime"] = ts
                    subTaskIdToFilename[ msg[i]["subTaskId"] ] = msg[i]["fileName"]
                    queryId = subTaskIdToQueryID[ msg[i]["subTaskId"] ]
		    console.log("Register:" + msg[i]["subTaskId"] + "\n" + "outputFile:" + msg[i]['fileName'] + "\n" + "queryId:" + queryId + "\n")
                    if(queryIdFinish[queryId] == undefined){
                        queryIdFinish[queryId] = [ msg[i]["subTaskId"] ]
                    }
                    else{
                        if(queryIdFinish[queryId].indexOf( msg[i]["subTaskId"]) == -1){
                        	queryIdFinish[queryId].push( msg[i]["subTaskId"] ) 
			}
                        else{
			    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>repeat: " + msg[i]["subTaskId"])	
			}
                    }
                     
                    if(queryIdFinish[queryId].length == queryIdToSubtaskId[queryId].length){
                        //完成，mvhadoop文件
                        let output = idToDesc[queryId]["output"]
                        if(output[0] == '/'){   //要移动到hadoop上去
                            moveFile(queryId) //移动所有文件
                        }
                        
                    }
                    
                }else{
                    timeMap[ msg[i]["subTaskId"] ]["failTime"] = ts
                }
            }
        }
    }
    catch(e){
        console.log(e)
    }
    /*
    if(finishID != undefined){
        try{
            timeMap[finishID]["finishTime"] = ts
        }
        //timeMap[finishID]["finishTime"] = ts
        catch(e){
            console.log(e)
        }
    }*/
    pushToFreeWorkerList(clientIp, availableNumber, workerName, port, maxNumber)
    jobScheduling()
    res.send({"status":"register OK"})
});

app.get('/api/queryStatus', async function(req, res){
    var queryId = req.query.queryId
    if(queryIdToSubtaskId[queryId] == undefined){
        res.send({"status":"no this queryId"})
    }
    else{
        var taskStatus = []
        var flag = false //是否在运行
        var cnt = queryIdToSubtaskId[queryId].length //子任务数
        var e = queryIdToSubtaskId[queryId].length
        var failedFlag = false
        var maxFinishTime = -1
        var startTime = -1
        for(let i = 0; i < queryIdToSubtaskId[queryId].length; i++){
            startTime = timeMap[queryIdToSubtaskId[queryId][i]].startTime
            taskStatus.push({ id:queryIdToSubtaskId[queryId][i],status:timeMap[queryIdToSubtaskId[queryId][i]], ip:taskIDtoIP[queryIdToSubtaskId[queryId][i]],inputFile:subTaskIdToInput[queryIdToSubtaskId[queryId][i]],  outputFile:subTaskIdToFilename[queryIdToSubtaskId[queryId][i]]})
            if( timeMap[queryIdToSubtaskId[queryId][i]]["failTime"] != undefined){
                failedFlag = true
                continue;
            }
            if(timeMap[queryIdToSubtaskId[queryId][i]].finishTime != undefined){
                maxFinishTime = Math.max(maxFinishTime, timeMap[queryIdToSubtaskId[queryId][i]].finishTime)
                cnt--
            }
            if(timeMap[queryIdToSubtaskId[queryId][i]].runTime != undefined){
                flag = true
            }
        }
        let mvFinish = true
        if(cnt == 0 && idToDesc[queryId]["output"][0] == "/"){
            for(let i = 0; i < queryIdToSubtaskId[queryId].length; i++){
		if( subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ] == undefined){
			continue
		}
                for(let j = 0; j < subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ].length; j++){
                        let filename = subTaskIdToFilename[ queryIdToSubtaskId[queryId][i] ][j]
                        let output = idToDesc[queryId]["output"]
                       // let url  = "http://hd044:8001/webhdfs/v1" + output + "/" + filename +"?op=GETFILESTATUS"
                       let url  = "http://" + proxyAddress+ "/webhdfs/v1" + output + "/" + filename +"?op=GETFILESTATUS"
                        let result = await fileExist(url)
	//		console.log(url)
          //              console.log(result)
                        if(result == "not exist" ){
			    console.log("not exist:" + url)
                            mvFinish = false
                            break
                        }
                }
                if(!mvFinish){
                    break
                }
            }
        }
      // console.log("cnt=" + cnt)
      // console.log("mvFinish=" + mvFinish)

        var Status;
        var now = new Date().getTime()
        var duration
        if(failedFlag){
            Status = "FAILED"
            duration = 0;
        }
        else if(cnt == 0 && mvFinish){
            Status = "SUCCEEDED"
            console.log(`returned SUCCEEDED for queryId=${queryId} at ${Date.now()}`)
            duration = maxFinishTime-startTime 
        }
        else if(flag){
            Status = "RUNNING"
            duration = now - startTime
        }
        else{
            Status = "ACCEPTED"
            duration = now - startTime
        }
        res.send({"queryId":queryId, status:Status, rate:(e-cnt)*1.0/e, startTime:startTime, duration:duration,message:"", taskDesc:idToDesc[queryId], "taskStatus":taskStatus})
    }
})

//查询所有总任务状态
app.get('/api/all-queries', async function(req, res){
    clearTask()
    var status = []
    for(let queryId in queryIdToSubtaskId){
        var taskStatus = []
        var flag = false //是否在运行
        var cnt = queryIdToSubtaskId[queryId].length //子任务数
        var e = queryIdToSubtaskId[queryId].length
        var failedFlag = false
        var maxFinishTime = -1
        var startTime = -1
        for(let i = 0; i < queryIdToSubtaskId[queryId].length; i++){
            taskStatus.push({ id:queryIdToSubtaskId[queryId][i],status:timeMap[queryIdToSubtaskId[queryId][i]], ip:taskIDtoIP[queryIdToSubtaskId[queryId][i]]})
            startTime = timeMap[queryIdToSubtaskId[queryId][i]]["startTime"]
            if( timeMap[queryIdToSubtaskId[queryId][i]]["failTime"] != undefined){
                failedFlag = true
                continue;
            }
            if(timeMap[queryIdToSubtaskId[queryId][i]].finishTime != undefined){
                maxFinishTime = Math.max(maxFinishTime, timeMap[queryIdToSubtaskId[queryId][i]].finishTime)
                cnt--;
            }
            if(timeMap[queryIdToSubtaskId[queryId][i]].runTime != undefined){
                flag = true
            }
        }
        var Status;
        var now = new Date().getTime()
        var duration
        if(failedFlag){
            Status = "FAILED"
            duration = 0
        }
        else if(cnt == 0){
            Status = "SUCCEEDED"
            duration = maxFinishTime - startTime
        }
        else if(flag){
            Status = "RUNNING"
            duration = now - startTime
        }
        else{
            Status = "ACCEPTED"
            duration = now - startTime
        }
        status.push({"queryId":queryId, "status":Status, "rate":(e-cnt)*1.0/e * 100, "startTime":startTime, "duration":duration, taskDesc:idToDesc[queryId], "taskStatus":taskStatus})
    }

    res.send({"status":status})
})

app.post('/api/whichWorker', async function(req, res){
    var subTaskId = req.body.subTaskId
    if(taskIDtoIP[subTaskId] != undefined){
        res.send({"workerIp":taskIDtoIP[subTaskId]})
    }
    else{
        res.send({"workerIp":""})
    }
})

//查看子任务 startTime runTime
app.post('/api/sub-task-status', async function(req, res){
    let ts = new Date().getTime();
    var subTaskId = req.body.subTaskId
   // console.log(subTaskId)
    console.log(timeMap[subTaskId])
    if(timeMap[subTaskId]["failTime"] != undefined){
        res.send({
            "status":"FAILED", 
            "runningAge":(timeMap[subTaskId]["failTime"]-timeMap[subTaskId]["runTime"]),
            "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
            "submitTime":timeMap[subTaskId]["startTime"],
            "taskDesc":idToDesc[subTaskId],
            "ip":taskIDtoIP[subTaskId]
        })
    }
    else if(timeMap[subTaskId]["finishTime"] != undefined){
        res.send({
            "status":"COMPLETED", 
            "runningAge":(timeMap[subTaskId]["finishTime"]-timeMap[subTaskId]["runTime"]),
            "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
            "submitTime":timeMap[subTaskId]["startTime"],
            "taskDesc":idToDesc[subTaskId],
            "ip":taskIDtoIP[subTaskId]
        })
    }
    else if(timeMap[subTaskId]["runTime"] != undefined){
        res.send({
            "status":"RUNNING",
            "runningAge": (ts-timeMap[subTaskId]["runTime"]),
            "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
            "submitTime":timeMap[subTaskId]["startTime"],
            "taskDesc":idToDesc[subTaskId],
            "ip":taskIDtoIP[subTaskId]
        })
    }
    else if(timeMap[subTaskId]["startTime"] != undefined){
         res.send({
            "status":"WAITING",
            "runningAge": "0",
            "waitingAge":(ts-timeMap[subTaskId]["startTime"]),
            "submitTime":timeMap[subTaskId]["startTime"],
            "taskDesc":idToDesc[subTaskId],
            "ip":taskIDtoIP[subTaskId]
        })
    }
    else{
        res.send({
            "status":"No this subTaskId"
        })
    }
})

app.post('/api/all-tasks',  async function(req, res){
    var S = []
    let ts = new Date().getTime();
    for(let subTaskId in timeMap){
        if(timeMap[subTaskId]["failTime"] != undefined){
            S.push({
                "status":"FAILED", 
                "runningAge":(timeMap[subTaskId]["failTime"]-timeMap[subTaskId]["runTime"]),
                "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
                "submitTime":timeMap[subTaskId]["startTime"],
                "taskDesc":idToDesc[subTaskId],
                "ip":taskIDtoIP[subTaskId]
            })
        }
        else if(timeMap[subTaskId]["finishTime"] != undefined){
            S.push({
                "status":"COMPLETED", 
                "runningAge":(timeMap[subTaskId]["finishTime"]-timeMap[subTaskId]["runTime"]),
                "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
                "submitTime":timeMap[subTaskId]["startTime"],
                "taskDesc":idToDesc[subTaskId],
                "ip":taskIDtoIP[subTaskId]
            })
        }
        else if(timeMap[subTaskId]["runTime"] != undefined){
            S.push({
                "status":"RUNNING",
                "runningAge": (ts-timeMap[subTaskId]["runTime"]),
                "waitingAge":(timeMap[subTaskId]["runTime"]-timeMap[subTaskId]["startTime"]),
                "submitTime":timeMap[subTaskId]["startTime"],
                "taskDesc":idToDesc[subTaskId],
                "ip":taskIDtoIP[subTaskId]
            })
        }
        else if(timeMap[subTaskId]["startTime"] != undefined){
            S.push({
                "status":"WAITING",
                "runningAge": "0",
                "waitingAge":(ts-timeMap[subTaskId]["startTime"]),
                "submitTime":timeMap[subTaskId]["startTime"],
                "taskDesc":idToDesc[subTaskId],
                "ip":taskIDtoIP[subTaskId]
            })
        }
    }

    res.send({"status":S})
})


app.post('/api/run-seqjs', async function(req, res){
    let nowTime = new Date().getTime()
    console.log(`received query=${JSON.stringify(req.body, null, 4)}`)
    var input = req.body.input  
    var output = req.body.output
    var seqJs = req.body.seqJs
    var constantArg = req.body.constantArg
    var filter = req.body.filter
    var arrCol = req.body.arrCol
    var outputCol = req.body.outputCol
    var stringifyOutput = req.body.stringifyOutput
    var keepArrCol = req.body.keepArrCol
    var stringifyArrCol = req.body.stringifyArrCol
    if(arrCol == undefined){
        arrCol = "arr"
    }
    if(outputCol == undefined){
        outputCol = "result"
    }
    if(stringifyOutput == undefined){
        stringifyOutput = true
    }
    if(keepArrCol == undefined){
        keepArrCol = false
    }
    if(stringifyArrCol == undefined){
        stringifyArrCol = true
    }
    var ID = await pushToPendingQueryList(input, output, seqJs, constantArg, filter, arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol)
    if(ID == "NO THIS DIR"){
        res.send({"status":"FAILED", "msg":"NO DIR"})
    }
    jobScheduling()
    res.send({"status":"ACCEPTED", "submitTime":nowTime, "taskDesc":{"input":input, "output":output, "seqJs":seqJs, "constantArg":constantArg, "filter":filter} ,"ID":ID})
});

function connectWorker(url){
    return new Promise( function(resolve, reject) {
        request.get({url:url}, function(error, response, body) {
                            if(error){
                                 resolve(-1)
                            }
                  
                            if(body == undefined){
                                resolve(-1)
                            }
                            else{
                                resolve(0)
                            }

        })
   })
}


app.listen(1234, function () {
  console.log('Example app listening on port 1234!');
});

async function callWorker(){
   // console.log("#########################")
    let ts = new Date().getTime()
    for(let ip in IPtoTaskID){
        let cnt = 0
        for(let taskIdIndex in IPtoTaskID[ip]){
            let taskId = IPtoTaskID[ip][taskIdIndex]
            if(timeMap[taskId]['finishTime'] != undefined || timeMap[taskId]['failTime'] != undefined){
                cnt++
            }
        }
        //如果所有的任务都已有状态，说明任务结束，不需要呼叫worker
        if(cnt == IPtoTaskID[ip].length){
          //  console.log("&&&&&&&&&&&&&&&")
            delete IPtoTaskID[ip]
            continue
        }

        var ava = await connectWorker("http://" + ip +"/hello")
        console.log(ava)
        if(ava == -1){
            console.log("call worker failed")
            for(let taskIdIndex in IPtoTaskID[ip]){
                //如果不是已经结束的任务，未完成的全部置为失败
                let taskId = IPtoTaskID[ip][taskIdIndex]
                if(timeMap[taskId]['finishTime'] == undefined){
                    timeMap[taskId]['failTime'] = ts
                }
            }
            //清除这个Ip
            delete IPtoTaskID[ip]
        }
    }
}

const  clearTaskTimer = ()=>{
  //每小时的第40分钟30秒定时执行一次:
    schedule.scheduleJob('30 40 * * * *',()=>{
        clearTask()
    }); 
    //每分钟去检查一下进入worker机的状态
    schedule.scheduleJob('30 * * * * *',()=>{
        callWorker()
    }); 
}

clearTaskTimer()

