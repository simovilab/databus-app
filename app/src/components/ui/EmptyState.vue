<template>
  <div class="empty-state">
    <ion-icon aria-hidden="true" :icon="icon ?? fileTrayOutline" color="medium" />
    <h2 class="empty-state__title">{{ title }}</h2>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Small, reusable "nothing here yet" placeholder for empty lists
// (no active run, no routes, no trips found, etc.).
import { IonIcon } from '@ionic/vue';
import { fileTrayOutline } from 'ionicons/icons';

defineProps<{
  /** Short heading, e.g. "No active run". */
  title: string;
  /** Optional supporting copy. */
  message?: string;
  /** Optional ionicons icon override (defaults to a tray icon). */
  icon?: string;
}>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-spacing-sm, 8px);
  padding: var(--app-spacing-lg, 24px);
  text-align: center;
  width: 100%;
}

.empty-state ion-icon {
  font-size: 2.5rem;
}

.empty-state__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state__message {
  margin: 0;
  color: var(--ion-color-medium);
}

.empty-state__action {
  margin-top: var(--app-spacing-sm, 8px);
}
</style>
