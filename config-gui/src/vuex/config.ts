import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

interface state {
  data: any
}

const state: state = {
  data: {}
}

const mutations = {
  update(state: state, data: any): void {
    state.data = data
  },

  updateFolder(state: state, data: any): void {
    state.data.folders = data
  }
}

const store = new Vuex.Store({ state, mutations })

export default store