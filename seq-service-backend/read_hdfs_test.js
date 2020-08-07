var WebHDFS = require('webhdfs')
hdfs = WebHDFS.createClient({
    user:'analysis',
    host:'hd044',
    port:'8001',
    path:'webhdfs/v1'
})
hdfs.readdir("/tmp/analysis/tmp_for_yangpei", function(err, files) {
    if (err) {
      return emitErr(err);
    }
   for(let i = 0; i < files.length; i++){
        console.log(files[i].pathSuffix)
   }
  // console.log(files)
})
