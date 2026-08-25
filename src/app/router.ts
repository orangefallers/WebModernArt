import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
