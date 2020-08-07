var WebHDFS = require('webhdfs')
var proxyAddress
if(process.env.proxyAddress != undefined){
    proxyAddress = process.env.proxyAddress
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

console.log( getHdfsDir("/user/hive/warehouse/useless") )

async function getHdfsDir(inputDir) {
    return new Promise( function(resolve, reject) {
      var f = []
      hdfs.readdir(inputDir, function(err, files) {
        if (err) {
        //    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
            reject(err);
        }
//  console.log(files)
        if(files == undefined){
          resolve(f)
        }
        else{
             for(let i = 0; i < files.length; i++){
                if(files[i].type == "FILE"){
                    f.push(files[i].pathSuffix)
                }
                else{
                    f = f.concat(await getHdfsDir(inputDir + "/" + files[i]) )
                }
             }
        }
        resolve(f);
      })
   }).catch(error => { console.log('caught', error.message); })
}