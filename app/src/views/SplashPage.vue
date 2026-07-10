<template>
  <ion-page>
    <ion-content class="ion-padding splash-content">
      <div class="splash-brand">
        <ion-spinner name="crescent" color="primary" />
        <h1>Databús</h1>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// PLACEHOLDER — Agent A3 owns the real implementation.
// Real behavior (master-plan §2.1 row 1): read the stored session via
// `useAuthStore().loadFromStorage()`, then route to `home` if a session
// was restored or `login` otherwise. For now this just demonstrates the
// Splash -> Login navigation edge of the router for the other agents.
import { IonContent, IonPage, IonSpinner } from '@ionic/vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  router.replace({ name: 'login' });
});
</script>

<style scoped>
.splash-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-spacing-md, 16px);
}
</style>
