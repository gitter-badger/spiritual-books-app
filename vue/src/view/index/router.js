import Vue from 'vue'
import Router from 'vue-router'
// import lang from '../../lang'

Vue.use(Router)

const router = new Router({
  // mode: 'history',
  linkActiveClass: 'is-active',
  scrollBehavior: () => ({ y: 0 }),
  routes: [
    {
      path: '/',
      name: 'index',
      component: () => import('@v/index/index')
    },
    {
      path: '/book',
      name: 'book',
      component: () => import('@v/index/book')
    },
    {
      path: '/audio',
      name: 'audio',
      component: () => import('@v/index/audio')
    },
    {
      path: '/hymn',
      name: 'hymn',
      component: () => import('@v/index/hymn')
    },
    {
      path: '/video',
      name: 'video',
      component: () => import('@v/index/video')
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
  // if (to.name) {
  //   document.title = lang[to.query.lang][to.name].Title
  // }
  next()
})
export default router
