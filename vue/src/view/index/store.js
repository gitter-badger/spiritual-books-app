import Vue from 'vue'
import Vuex from 'vuex'
import lan from '@/lang'
import { getLanguage, stg } from '@/util/index'

Vue.use(Vuex)

const state = {
  dark: false,
  lang: null,
  language: null
}

const mutations = {
  setDark: (state, data) => {
    state.dark = data
  },
  setLang: (state, data) => {
    state.lang = data
    stg().setItem('lang', data)
    state.language = lan[data]
  }
}

const actions = {
  setDark: ({ commit }, data) => {
    commit('setDark', data)
  },
  setLang: ({ commit }, data) => {
    commit('setLang', data)
  }
}

const getters = {
  language: state => {
    return state.language || getLanguage()
  }
}

export default new Vuex.Store({
  state,
  getters,
  mutations,
  actions
})
