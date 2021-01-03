import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = new Router({
  // mode: 'history',
  linkActiveClass: 'is-active',
  scrollBehavior: () => ({ y: 0 }),
  routes: [
    {
      path: '/',
      name: 'index',
      component: () => import('@v/plan/index')
    },
    {
      path: '/add',
      name: 'addPlan',
      component: () => import('@v/plan/add')
    },
    {
      path: '/list',
      name: 'planList',
      component: () => import('@v/plan/list')
    }
  ]
})
router.onError((error) => {
  const pattern = /Loading chunk (\d)+ failed/g
  const isChunkLoadFailed = error.message.match(pattern)
  const targetPath = router.history.pending.fullPath
  if (isChunkLoadFailed) {
    router.replace(targetPath)
  }
})
router.beforeEach((to, _, next) => {
  to.query.lang = (navigator.browserLanguage || navigator.language).toLowerCase()
  next()
})
export default router
