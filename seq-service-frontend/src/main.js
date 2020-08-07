import Vue from 'vue'
import App from './App.vue'
import ViewUI from 'view-design'
import router from './router'

// import style
import 'view-design/dist/styles/iview.css'
Vue.use(ViewUI)
// if (process.env.NODE_ENV !== 'production') require('./mock')
Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
