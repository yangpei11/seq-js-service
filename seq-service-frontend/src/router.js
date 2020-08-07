import Vue from 'vue'
import Router from 'vue-router'
import Overview from './views/Overview.vue'
import QueryDetail from './views/QueryDetail.vue'
import SubmitTask from './views/SubmitTask.vue'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: '/ui/',
  routes: [
    {
      path: '/',
      name: 'overview',
      component: Overview
    },
    {
      path: '/query-detail',
      name: 'query-detail',
      component: QueryDetail,
      // props: true 的话，只会把隐式传递的params作为props
      props: (route) => {
        // debugger
        return {
          queryId: route.query.queryId
        }
      }
    },
    {
      path: '/submit-task',
      name: 'submit-task',
      component: SubmitTask
    }
  ]
})
export default router
