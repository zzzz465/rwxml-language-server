import Vue from 'vue'
import ConfigPanel from './components/ConfigPanel.vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: RouteConfig[] = [
    { path: '/config', component: ConfigPanel }
]

const router = new VueRouter({
    routes
})


export default router