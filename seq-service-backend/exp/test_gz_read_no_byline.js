var fs = require('fs')
var zlib = require('zlib')
var byline = require('byline')
var unzip = zlib.createGunzip();
let input = 'test_data/000003_0.gz'

let fileStream = fs.createReadStream( input )
let unzipStream = fileStream.pipe(unzip)
// let bylineStream = byline.createStream(unzipStream )


// https://javascript.ruanyifeng.com/nodejs/buffer.html
let arr = []
unzipStream.on('data', (data) => 
{
    arr.push(data)
})


unzipStream.on('finish', (data) => 
{
    let str = Buffer.concat(arr).toString()
    console.log(str)
})

