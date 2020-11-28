import Vue from 'vue'
import CreateConfig from './components/CreateConfig.vue'
import VueRouter, { RouteConfig } from 'vue-router'

Vue.use(VueRouter)

const routes: RouteConfig[] = [
    { path: '/config/create', component: CreateConfig }
]

const router = new VueRouter({
    routes
})


export default router