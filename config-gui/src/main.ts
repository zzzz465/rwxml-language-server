import Vue from 'vue'
import Vuex from 'vuex'
import App from './App.vue'
import router from './router'
import { vscode } from './vscode'

Vue.config.productionTip = false

const mockObject = {
  postMessage(msg: any) {
    console.log(msg)
  }
}

//@ts-ignore
const vscode: vscode = process.env.NODE_ENV === 'production' ? acquireVsCodeApi() : mockObject

Vue.use({
  install: function (vue, options) {
    vue.prototype.$vscode = vscode
    vue.prototype.$window = window
  }
})

Vue.use(Vuex)

interface store {
  path: string
  data: any
}
const store = new Vuex.Store<store>({
  state: {
    path: '/',
    data: undefined
  },
  mutations: {
    update (state: any, payload: any) {
      state.path = payload.path
      state.data = payload.data
    }
  }
})

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'update':
    case 'routeChange': {
      store.commit('update', event.data)
    } break

    case 'fetch': {
      vscode.postMessage(store.state.data)
    } break
  }
})

new Vue({
  router, store,
  render: h => h(App),
}).$mount('#app')
