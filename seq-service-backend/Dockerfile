FROM harbor-registry.inner.youdao.com/devops/node:10
#FROM harbor-registry.inner.youdao.com/analysis/npm-krb5:latest
#FROM harbor-registry.inner.youdao.com/analysis/npm-krb5:20200628_2
RUN apt-get update
RUN apt-get install -y net-tools
WORKDIR /code
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY *.js ./
COPY entrypoint.sh /
#COPY analysis_dev.keytab ./
COPY worker_conf.json ./
COPY hosts /hosts
#ENV LANG en_US.UTF-8
ENTRYPOINT ["bash","/entrypoint.sh"]
#ENTRYPOINT ["tail", "-f", "/dev/null"]
#CMD ["solo"]
