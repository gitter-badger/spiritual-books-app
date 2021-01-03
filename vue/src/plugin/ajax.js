import { stg } from '@/util/index'
// import router from '@/router'
import conf from '@/config'
import axios from 'axios'
import qs from 'qs'
import toast from './toast.vue'

// 创建axios实例
const service = axios.create({
  withCredentials: false,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})
// request拦截器
service.interceptors.request.use(config => {
  const token = stg().getItem('token')
  if (token) {
    config.headers['Authorization'] = token // 让每个请求携带自定义token 请根据实际情况自行修改
  }
  return config
}, error => {
  // Do something with request error
  console.log(error) // for debug
  Promise.reject(error)
})

export default {
  /**
   * Vue插件默认安装方法
   * @param {Object} Vue 当前vue实例对象
   * @param {Object} options 插件参数
   */
  install: (Vue, option) => {
    // const v = new Vue({
    //   render(createElement) {
    //     return createElement(toast)
    //   }
    // })
    const v = new Vue(toast)
    document.body.appendChild(v.$mount().$el)
    /**
     * @param {String} api 接口地址
     */
    Vue.prototype.$getHtml = async(api) => {
      return new Promise((resolve, reject) => {
        service.get(`${conf.homePage}/${api}`).then(res => {
          if (res.status === 200) {
            resolve(res.data)
          } else {
            v.error('页面请求失败')
            reject(false)
          }
        }).catch((e) => {
          reject(e)
        })
      })
    }
    Vue.prototype.$get = async(api, params) => {
      return new Promise((resolve, reject) => {
        service.get(`${conf.baseApi}/${api}`, {
          params,
          paramsSerializer: function(params) {
            return qs.stringify(params, { arrayFormat: 'repeat', indices: false })
          }
        }).then(res => {
          if (res.status === 200 && res.data.state === 'success') {
            resolve(res.data.data)
          } else {
            if (res.data.message) {
              v.error(res.data.message)
            }
            reject(false)
          }
        }).catch((e) => {
          reject(e)
        })
      })
    }
    Vue.prototype.$post = async(api, params) => {
      return new Promise((resolve, reject) => {
        service.post(`${conf.baseApi}/${api}`, params, { indices: false }).then(res => {
          if (res.status === 200 && res.data.state === 'success') {
            resolve(res.data.data)
          } else {
            if (res.data.message) {
              v.error(res.data.message)
            }
            reject(false)
          }
        }).catch((e) => {
          reject(e)
        })
      })
    }
    Vue.prototype.$success = (text) => {
      v.success(text)
    }
    Vue.prototype.$info = (text) => {
      v.info(text)
    }
    Vue.prototype.$error = (text) => {
      v.error(text)
    }
    Vue.prototype.$warning = (text) => {
      v.warning(text)
    }
  }
}
