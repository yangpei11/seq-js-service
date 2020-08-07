## 本地编译打包

## 打Docker镜像
```shell
sudo docker build -t  harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest .
```

## registry登录(只需要做一次, 如果下面push没有提供需要登陆的话，不需要做)
```shell
sudo docker login harbor-registry.inner.youdao.com
```

## push
```shell
sudo docker push harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest
```

## 本地 docker 运行
### master
在后台运行：
```shell
sudo docker run -d -p 1234:1234 --name seqjs-exec-master -e ROLE=master -e MASTER_PORT=1234 harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest
```
在前台运行：

 sudo docker run -p 1234:1234 -e ROLE=master -e MASTER_PORT=1234 -it --rm harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest
### worker
```shell
sudo docker run -p 4321:4321 --name seqjs-exec-worker -e ROLE=worker -e MASTER_HOST=localhost -e MASTER_PORT=1234 -e WORKER_PORT=4321 harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest worker
```

### debug 
```shell
sudo docker run -it --rm --entrypoint=bash harbor-registry.inner.youdao.com/analysis/seqjs-exec:latest
```
sudo docker run -v `pwd`:/code -it --rm --entrypoint=bash harbor-registry.inner.youdao.com/devops/node:10



## 环境变量
ROLE
MASTER_HOST_PORT
PROXY_ADDR
