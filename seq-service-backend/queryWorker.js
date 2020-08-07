var request = require("request")
request.post({url:'http://'+'hd020:1234'+'/api/viewReadyTask', form:{
}}, function(error, response, body) {
    console.log(body)
})
