#!/bin/sh
cat /hosts >> /etc/hosts
mkdir -p /code/etc
#cp /analysis_dev.keytab /code/etc/
if [ "$ROLE" == "" ]; then
  echo "env 'ROLE' must be 'master' or 'worker'"
  echo "env 'PROXY_ADDR' must be 'host:port/gateway/eadhadoop/hdfs' format"
  echo "env 'MASTER_HOST_PORT' must be 'host:port' format"
  exit 1
fi

if [ "$ROLE" == "master" ]; then
  cd /code
  node master.js
fi

if [ "$ROLE" == "worker" ]; then
  export WORKER_NAME=$(hostname)
  cd /code
  node --experimental-worker client.js
fi
