import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'splash',
    component: () => import('../views/SplashPage.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginPage.vue'),
  },
  {
    path: '/tabs/',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/HomePage.vue'),
      },
      {
        path: 'trips',
        name: 'trips',
        component: () => import('../views/TripsPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/ProfilePage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Global auth guard: unauthenticated users are redirected to /login,
// authenticated users are redirected away from /login into the app.
// Reads `isAuthenticated` from the auth store per master-plan §6.2 —
// the store implementation lands with Agent A2; this guard only relies
// on the frozen signature.
router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'home' };
  }

  return true;
});

export default router;
