const fs = require('fs');
const zlib = require('zlib');
const zip = zlib.createGzip();
const writeStream = fs.createWriteStream(`testOut.gz`);
zip.pipe(writeStream);

zip.write('hello');
zip.end();
