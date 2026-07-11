<template>
  <ion-page>
    <ion-content :fullscreen="true" class="splash-content">
      <div class="splash-brand">
        <h1 class="splash-brand__wordmark">
          Data<span class="splash-brand__accent">bús</span>
        </h1>
        <p class="splash-brand__tagline">Operador</p>
        <AppLoading message="Iniciando…" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Splash gate (master-plan §2.1 row 1). On mount we rehydrate the persisted
// session via `useAuthStore().loadFromStorage()`, then route to Home if a
// session was restored or to Login otherwise. No API call happens here — only
// local storage read — so the splash is fast and never blocks on the network.
// Every awaited promise is handled: a storage failure degrades to Login
// rather than leaving an unhandled rejection on app boot.
import { IonContent, IonPage } from '@ionic/vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLoading from '@/components/ui/AppLoading.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    await authStore.loadFromStorage();
  } catch {
    // Corrupt/missing storage is treated as logged out by the store; a
    // throw here would only come from the Preferences bridge itself, so we
    // fall through to Login rather than stranding the user on the splash.
  }

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

.splash-brand__wordmark {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ion-color-light);
}

.splash-brand__accent {
  color: var(--ion-color-primary);
}

.splash-brand__tagline {
  margin: 0 0 var(--app-spacing-md, 16px);
  color: var(--ion-color-medium-tint, #797e7b);
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
</style>
