var fs = require('fs')
var zlib = require('zlib')
// https://www.npmjs.com/package/split
let split = require('split')
var unzip = zlib.createGunzip();
let input = 'test_data/000003_0.gz'

let fileStream = fs.createReadStream( input )
let unzipStream = fileStream.pipe(unzip)
let bylineStream = unzipStream.pipe(split())

bylineStream.on('data', (line) => 
{
    console.log(line.toString())
})
