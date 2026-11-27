import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/plants' },
  { path: '/login', name: 'Login', component: () => import('../views/LoginPage.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/RegisterPage.vue') },
  { path: '/plants', name: 'Plants', component: () => import('../views/PlantListPage.vue'), meta: { requiresAuth: true } },
  { path: '/plants/new', name: 'PlantNew', component: () => import('../views/PlantFormPage.vue'), meta: { requiresAuth: true } },
  { path: '/plants/:id', name: 'PlantDetail', component: () => import('../views/PlantDetailPage.vue'), meta: { requiresAuth: true } },
  { path: '/plants/:id/edit', name: 'PlantEdit', component: () => import('../views/PlantFormPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('../views/SettingsPage.vue'), meta: { requiresAuth: true } },
];

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.init();
  if (to.meta.requiresAuth && !auth.user) return '/login';
  if ((to.path === '/login' || to.path === '/register') && auth.user) return '/plants';
  return true;
});

export default router;
