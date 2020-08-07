#!/bin/sh
kill `cat master.pid`
exec node master.js &>>master.log & echo $! > master.pid
