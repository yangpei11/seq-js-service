var WebHDFS = require('webhdfs')
var fs = require('fs')
var zlib = require('zlib')
var byline = require('byline')
var Pool = require('worker-threads-pool')
var pool = new Pool({max:7})
var sleep = require('thread-sleep')
console.time("time")
//hdfs_file_name = '/tmp/analysis/tmp_for_chenzhi/000002_0'
//hdfs_file_name = '/tmp/analysis/tmp_for_yangpei/gz_input/20190909_065119_01955_e9ajx_bucket-00000.gz'
hdfs_file_name = "/tmp/analysis/tmp_for_yangpei/tmp_test_mdc_gz_json/000031_0.gz"
hdfs = WebHDFS.createClient({
    user:'analysis',
    host:'hd044',
    port:'8001',
    path:'webhdfs/v1'
})

var remoteFileStream = hdfs.createReadStream( hdfs_file_name )
var unzip = zlib.createGunzip();
var stream = byline.createStream( remoteFileStream.pipe(unzip) )
var i = 0
var j = 0
var k = 40000
console.time("time")
stream.on('data', function(line){
  k--;
  //console.log(k) 
  if(k==0){
     console.timeEnd("time")
     k = 40000
     console.time("time")
  }
  /* var opts = {workerData:line.toString()}
   j = j + 1
   if(j-i>=100){
	sleep(100000)
   }
   console.log(opts)
   pool.acquire('./worker.js', opts, function(err, worker){
	if(err) throw err
	worker.on('message', function(msg){
	   console.log(msg)
	})
	worker.on('exit', function(){
            i = i + 1
            console.log("任务队列长度: "+ (j-i) )
	    if(i%100 == 0){
                 console.log(i)
	    }
	    if( pool.size == 0){
	    	console.timeEnd('time')
	    }
	})
   }) 
  // console.log("##############################################")
  // console.log(line.toString());*/
})

remoteFileStream.on("error", function onError(err) { //handles error while read
    // Do something with the error
    console.log("...error: ", err);
});
let dataStream = [];

remoteFileStream.on("data", function onChunk(chunk) { //on read success
    // Do something with the data chunk 
   // dataStream.push(chunk);
  // console.log(dataStream.length)
   // console.log("****");
   // buf = new Buffer(dataStream);
   /* fs.writeFile("output.gz", buf, function(err){
    	if(err){ return console.error(err); }
	console.log("数据写入成功!");
    });*/
   // console.log('..chunk..',chunk);
});
remoteFileStream.on("finish", function onFinish() { //on read finish
    console.log('..on finish..');
    /*buf = Buffer.concat(dataStream);
    console.log(buf.length)
     fs.writeFile("output.gz", buf, function(err){

          if(err){ return console.error(err); }
                  console.log("数据写入成功!");
     });*/
   // console.log('..file data..',dataStream);
});
