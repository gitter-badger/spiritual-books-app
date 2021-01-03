import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'book',
      component: () => import('@v/book/index')
    },
    {
      path: '/detail',
      name: 'bookDetail',
      component: () => import('@v/book/detail')
    }
  ]
})
