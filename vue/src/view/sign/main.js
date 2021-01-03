import Vue from 'vue'
import App from './app.vue'
import ajax from '@/plugin/ajax'
import vuetify from '@/plugin/vuetify'

Vue.use(ajax)
Vue.config.productionTip = false

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
