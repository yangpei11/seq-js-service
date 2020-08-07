var WebHDFS = require('webhdfs')
var proxyAddress
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

function getHdfsDir(inputDir) {
    return new Promise( function(resolve, reject) {
      var f = []
      hdfs.readdir(inputDir, async function(err, files) {
        if (err) {
        //    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
            reject(err);
        }
//	console.log(files)
        if(files == undefined){
          resolve(f)
        }
        else{
       		 for(let i = 0; i < files.length; i++){
       		 	if(files[i].type == "FILE"){
                 //   console.log(files[i].pathSuffix)
                    f.push(files[i].pathSuffix)
                }
                else{
                 //   console.log(files[i].pathSuffix)
                    let tmp = await  getHdfsDir(inputDir + "/" + files[i].pathSuffix)
                    f = f.concat(tmp)
                }
       		 }
	}
        resolve(f);
      })
   }).catch(error => { console.log('caught', error.message); })
}

//console.log(getHdfsDir("/tmp/analysis/tmp_for_yangpei/4gz"))
module.exports = getHdfsDir;
