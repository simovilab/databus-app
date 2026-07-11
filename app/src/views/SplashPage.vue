<template>
  <ion-page>
    <ion-content :fullscreen="true" class="splash-content">
      <div class="splash-brand">
        <BrandLogo variant="light" height="64px" class="splash-brand__logo" />
        <p class="splash-brand__tagline">App</p>
        <AppLoading message="Iniciando…" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Splash gate (master-plan §2.1 row 1). Store rehydration already happened in
// main.ts bootstrap() (before the router guard), so the splash only routes:
// to Home if a session was restored, otherwise to Login. This is the
// cold-start landing at '/'; a hard refresh on a deep link is handled by the
// same pre-mount rehydration plus the router's auth guard.
import { IonContent, IonPage } from '@ionic/vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLoading from '@/components/ui/AppLoading.vue';
import BrandLogo from '@/components/ui/BrandLogo.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  const target = authStore.isAuthenticated
    ? { path: '/tabs/home' }
    : { name: 'login' };
  router.replace(target);
});
</script>

<style scoped>
.splash-content {
  --background: var(--ion-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-spacing-sm, 8px);
}

.splash-brand__logo {
  margin: 0 auto;
}

.splash-brand__tagline {
  margin: 0 0 var(--app-spacing-md, 16px);
  color: var(--ion-color-medium-tint, #797e7b);
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
</style>
