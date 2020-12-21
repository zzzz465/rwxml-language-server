import Vue from 'vue'
import Vuex from 'vuex'
import 'element-ui/lib/theme-chalk/index.css'
import ElementUI from 'element-ui'
import App from './App.vue'
import router from './router'
import store from './vuex/config'

Vue.config.productionTip = false

const mockObject = {
  postMessage(msg: any) {
    console.log(msg)
  }
}

const vscode: vscode = process.env.NODE_ENV === 'production' ? acquireVsCodeApi() : mockObject

Vue.use({
  install: function (vue, options) {
    vue.prototype.$vscode = vscode
    vue.prototype.$window = window
  }
})

Vue.use(ElementUI)

window.addEventListener('message', event => {
  console.log(event.data)
  switch (event.data.type) {
    case 'update': {
      store.commit('update', event.data.data)
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
