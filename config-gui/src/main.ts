import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

//@ts-ignore
const vscode = acquireVsCodeApi()

setInterval(() => {
  vscode.postMessage({
    command: 'alert',
    text: 'hello world!!!!!!!!'
  })
  console.log(vscode)
}, 1000)

new Vue({
  render: h => h(App),
}).$mount('#app')
