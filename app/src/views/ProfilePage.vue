<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Perfil</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <section class="profile-card">
        <div class="profile-card__avatar">
          <ion-icon :icon="personCircleOutline" color="primary" />
        </div>
        <h2 class="profile-card__name">{{ fullName }}</h2>
        <p class="profile-card__id">Operador {{ operatorId }}</p>
      </section>

      <section class="profile-actions">
        <ion-button
          expand="block"
          color="danger"
          fill="outline"
          :disabled="pending"
          @click="logout"
        >
          <ion-spinner v-if="pending" name="crescent" slot="start" />
          {{ pending ? 'Cerrando…' : 'Cerrar sesión' }}
        </ion-button>
      </section>

      <p class="profile-version">Databús · v0</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Profile (master-plan §2.1 row 14). Shows the operator's name + operatorId
// and a Logout button that clears the session via `useAuthStore().logout()`
// then replaces into `/login`. Logout only touches local storage (no API
// call), but we still guard it so a storage-bridge failure routes to Login
// rather than stranding the user — no unhandled rejection.
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { personCircleOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const pending = ref(false);

const fullName = computed(() => {
  const s = authStore.session;
  if (!s) return 'Operador';
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Operador';
});

const operatorId = computed(() => authStore.session?.operatorId ?? '—');

async function logout(): Promise<void> {
  pending.value = true;
  try {
    await authStore.logout();
  } catch {
    // Even if storage clearing fails, leave the in-memory session cleared
    // (the store nulls it first) and send the user to Login.
  } finally {
    pending.value = false;
    router.replace('/login');
  }
}
</script>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-spacing-xs, 4px);
  padding: var(--app-spacing-xl, 32px) 0 var(--app-spacing-lg, 24px);
  text-align: center;
}

.profile-card__avatar ion-icon {
  font-size: 4rem;
}

.profile-card__name {
  margin: var(--app-spacing-sm, 8px) 0 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.profile-card__id {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.profile-actions {
  margin-top: var(--app-spacing-lg, 24px);
}

.profile-version {
  margin-top: var(--app-spacing-xl, 32px);
  text-align: center;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}
</style>
