import Vue from 'vue'
import App from './app.vue'
import router from './router'
import ajax from '@/plugin/ajax'
import vuetify from '@/plugin/vuetify'

Vue.use(ajax)
Vue.config.productionTip = false

new Vue({
  router,
  vuetify,
  render: h => h(App)
}).$mount('#app')
