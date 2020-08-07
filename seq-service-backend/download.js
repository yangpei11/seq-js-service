var fs = require('fs')
var request = require('request')
var crypto = require('crypto')
var md5 = crypto.createHash('md5')


function getJS(url) {
    return new Promise( function(resolve, reject) {
      request.get({url:url, form:{}}, 
            function(error, response,body){
	       if(error){
			resolve(error)
		}
                if(body == undefined){
			resolve(-1)
		}
		else{
                	resolve(body)
		}
	   })
    })
} 
async function download(url){ 
       var result = md5.update(url).digest('hex')
       var content = await getJS(url)
       fs.writeFileSync(result, content)
       return result 
}
//dowload("http://hd020:18080/jsCode?id=match_seqs_v3_js")
module.exports = getJS

