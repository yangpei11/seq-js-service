var request = require('request')
var getIPAddress = require('./getIP.js')
var getJS = require('./download.js')
var express = require('express')
var bodyParser  = require('body-parser')
var schedule = require('node-schedule')
var fs = require('fs')
const childProcess = require('child_process')
var app = express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var retMsg = [] //返回的消息
var availableNumber = require('./worker_conf.json').processorNum
var maxNumber = availableNumber

let MasterHostPort
if(process.env.MASTER_HOST_PORT != undefined){
    MasterHostPort = process.env.MASTER_HOST_PORT
}
else{
    MasterHostPort = require('./worker_conf.json').masterHostPort
}

var WorkerPort
if(process.env.WORKER_PORT != undefined){
    WorkerPort = process.env.WORKER_PORT
}
else{
    WorkerPort = require('./worker_conf.json').workerPort
}
var WorkerName
if(process.env.WORKER_NAME != undefined){
    WorkerName = process.env.WORKER_NAME
}
else{
    WorkerName = require('./worker_conf.json').workerName
}

request.post({url:'http://' + MasterHostPort + '/api/register', form:{
    "avaProNum": availableNumber,
    "IP": getIPAddress(),
    "NAME":WorkerName,
    "PORT":WorkerPort,
    "maxNumber":maxNumber
}}, function(error, response, body) {
    console.log(body)
})

app.get('/hello', function(seq,res){
        res.send("world")
})

app.post('/api/getIdleProcessNumber', function(req, res){
    //console.log(availableNumber)
    res.send({availableNumber:availableNumber})
})

/*
function download(url){
    return new Promise( function(resolve, reject) {
        request.get({url:url, form:{}}, 
            function(error, response, body){
                if(error){
                    reject(error)
                }
                resolve(JSON.parse(body).availableNumber)
        })
   })
}*/
function getPathArg(target){
    var ss =  target.split('/') 
    var result = []
    var arg = {}
    var flag = false
    for(let s in ss){
        s = ss[s]
        let index = s.search('=')
        if(index != -1){
            flag = true
            let s1 = s.substr(0, index)
            let s2 = s.substr(index+1, s.length-index)
            arg[s1] = s2
        }
    }
    if(!flag) return -1
    arg = JSON.stringify(arg)
    return arg.substr(0, arg.length-1)
}

function createParamFile (params) {
    let dir = 'tmp';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    var fileName = dir + '/' + params.subTaskId
    fs.writeFileSync(fileName, JSON.stringify(params, null, 4))
    return fileName
}

app.post('/api/run-seqjs', async function(req, res){
    //try{
        if(availableNumber <= 0){
           res.send({status: 'FAIL', availableNumber}) 
           return
        }
        
        // 警示：这行代码要放在所有await之前，否则会造成数据不一致
        availableNumber--
        
        console.log(`received queryId=${req.body.queryId} subTaskId=${req.body.subTaskId} input=${req.body.input} availableNumber=${availableNumber}`)
        console.log(req.body)
        var queryId = req.body.queryId
        var subTaskId = req.body.subTaskId
        var input = req.body.input
        var output = req.body.output
        var seqJs = req.body.seqJs
        var constantArg = req.body.constantArg
        var filter = req.body.filter
        //arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol
        var arrCol = req.body.arrCol
        var outputCol = req.body.outputCol
        var stringifyOutput = req.body.stringifyOutput
        var keepArrCol = req.body.keepArrCol
        var stringifyArrCol = req.body.stringifyArrCol
        
        //"seqJs": "http://a.com/1.js,http://b.com/1.js"
        if(seqJs.substr(0,7) == "http://" || seqJs.substr(0,8) == "https://"){
            let httpPath = seqJs.split(',')
            for(let i = 0; i < httpPath.length; i++){
                let ret = await getJS(httpPath[i])
                if(ret != -1){
                    seqJs = ret
                    break
                }
            }
            //seqJs= await getJS(seqJs)
        }
        if(constantArg.substr(0,7) == "http://" || constantArg.substr(0,8) == "https://"){
            let httpPath = constantArg.split(',')
            for(let i = 0; i < httpPath.length; i++){
                let ret = await getJS(httpPath[i])
                if(ret != -1){
                    constantArg = ret
                    break
                }
            }
        }
       // console.log(seq)
       // console.log(constantArg)
        
        var pathArg = getPathArg(input)
        console.log("现在可用数:" + availableNumber) 
        // console.log("queryId=" + queryId)
        let taskParamFile = createParamFile({
            input, queryId, subTaskId, seqJs, constantArg, filter, output, arrCol,
             outputCol, stringifyOutput, keepArrCol, stringifyArrCol, pathArg
        })

        const worker = childProcess.fork('./groupThread.js', [taskParamFile])
        worker.on("message", (msg) => {
            console.log("finish a task")
	        console.log(msg)
            availableNumber++;
            retMsg = []
            retMsg.push(msg)
            //做完了，去领任务
            request.post({url:'http://' + MasterHostPort +'/api/register', form:{
                    "avaProNum": availableNumber,
                    "IP": getIPAddress(),
                    "NAME":WorkerName,
                    "PORT":WorkerPort,
		            "msg": JSON.stringify(retMsg),
                    "maxNumber":maxNumber
                }}, function(error, response, body) {
                    //如果成功
                    if(body != undefined){
                        retMsg = []
                    }
                    console.log(body)
            })
        })
        console.log(`send recv ok for queryId=${req.body.queryId} subTaskId=${req.body.subTaskId} input=${req.body.input} with availableNumber=${availableNumber}`)
	    res.send({status:'OK', availableNumber:availableNumber})
    //}
    //catch(err){
    //    res.send({ status:"ERROR", code:err});
    //}
})



app.listen(WorkerPort, function () {
  console.log('Example app listening on port '+ WorkerPort+'!');
});

function callMaster(){
    if(availableNumber == maxNumber){
        request.post({url:'http://' + MasterHostPort +'/api/register', form:{
                    "avaProNum": availableNumber,
                    "IP": getIPAddress(),
                    "NAME":WorkerName,
                    "PORT":WorkerPort,
                    "msg": JSON.stringify(retMsg),
                    "maxNumber":maxNumber
                }}, function(error, response, body) {
                    //如果成功
                    if(body != undefined){
                        retMsg = []
                    }
                    console.log(body)
            })
    }
}

const  clearTaskTimer = ()=>{
  //每小时的每分钟30秒定时执行一次:
    schedule.scheduleJob('30 * * * * *',()=>{
        callMaster()
    }); 
}

clearTaskTimer()


const  clearParamFileTimer = ()=>{
    // TODO: 删除24小时之前生成的参数文件
}
  
// 每10分钟检查过期的参数文件
setInterval(clearParamFileTimer, 10 * 60 * 1000)

