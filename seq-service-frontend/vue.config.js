const path = require('path')
const resolve = dir => path.join(__dirname, dir)
const BASE_URL = process.env.NODE_ENV === 'production' ? '/ui' : '/ui'
//const BACKEND_SERVER = 'http://ns013x.corp.youdao.com:1234'
// const BACKEND_SERVER = 'http://ns013x.corp.youdao.com:28080'
const BACKEND_SERVER = 'http://seqjs-exec-svc-dev.inner.youdao.com:80'

module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  baseUrl: BASE_URL,
  chainWebpack: config => {
    config.resolve.alias
      .set('@', resolve('src'))
      .set('_c', resolve('src/components'))
      .set('_v', resolve('src/views'))
    // 参考： https://github.com/artemsky/vue-snotify/issues/14
    config.resolve.alias.set('vue$', 'vue/dist/vue.esm.js')
  },
  devServer: {
    index: 'index.html',
    disableHostCheck: true,
    proxy: {
      // 参考 https://cli.vuejs.org/zh/config/#devserver-proxy
      // 参考 https://github.com/chimurai/http-proxy-middleware#proxycontext-config
      '/api': {
        target: BACKEND_SERVER,
        ws: true,
        changeOrigin: true
      }
    }
  }
}
