var request = require("request")
const MasterHostPort = process.argv[2];
const InputDir = process.argv[3];
const output = process.argv[4];
console.log('MasterHostPort' + MasterHostPort + ' InputDir=' + InputDir);
request.post({url:'http://'+MasterHostPort+'/api/run-seqjs', form:{
    "input": InputDir,
    "output": output,
    "seqJs":"http://hd020:18080/jsCode?id=match_seqs_v3_js",
    "constantArg":"http://hd020:18080/snippet/slow3",
    "filter":"true"
}}, function(error, response, body) {
    console.log(body)
})
