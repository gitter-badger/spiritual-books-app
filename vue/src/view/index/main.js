
// import '@as/css/normalize.css'
// import 'material-design-icons-iconfont/dist/material-design-icons.css'
import Vue from 'vue'
import App from './app.vue'
import router from './router'
import store from './store'
import ajax from '@/plugin/ajax'
import vuetify from '@/plugin/vuetify'

Vue.use(ajax)
Vue.config.productionTip = false

new Vue({
  router,
  vuetify,
  store,
  render: h => h(App)
}).$mount('#app')
