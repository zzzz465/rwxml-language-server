import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

//@ts-ignore
const vscode = acquireVsCodeApi()

Vue.use({
  install: function (vue, options) {
    vue.prototype.$vscode = vscode
  }
})

new Vue({
  render: h => h(App),
}).$mount('#app')
