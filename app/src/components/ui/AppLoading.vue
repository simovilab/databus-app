<template>
  <Transition appear name="app-loading-fade">
    <div class="app-loading">
      <ion-spinner name="crescent" color="primary" />
      <p v-if="message" class="app-loading__message">{{ message }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// Small, reusable loading indicator. Feature pages should use this instead
// of hand-rolled spinners so the app has one loading look everywhere.
import { IonSpinner } from '@ionic/vue';

withDefaults(
  defineProps<{
    /** Optional caption shown under the spinner, e.g. "Loading routes…" */
    message?: string;
  }>(),
  { message: undefined },
);
</script>

<style scoped>
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-spacing-sm, 8px);
  padding: var(--app-spacing-lg, 24px);
  width: 100%;
}

.app-loading__message {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  margin: 0;
}

/* Small fade-in so the spinner doesn't just pop in — purely decorative,
   nothing waits on it (see the global prefers-reduced-motion override in
   theme/variables.css, which collapses this to instant). */
.app-loading-fade-enter-active {
  transition: opacity var(--app-motion-fast, 150ms) var(--app-motion-ease, ease-out);
}
.app-loading-fade-enter-from {
  opacity: 0;
}
</style>
