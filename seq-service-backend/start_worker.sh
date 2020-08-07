#!/bin/sh
kill `cat worker.pid`
exec node --experimental-worker client.js &>>worker.log & echo $! > worker.pid
