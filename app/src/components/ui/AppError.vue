<template>
  <div class="app-error">
    <ion-icon aria-hidden="true" :icon="alertCircleOutline" color="danger" />
    <p class="app-error__message">{{ friendlyMessage }}</p>
    <ion-button v-if="retryLabel" size="small" fill="outline" @click="emit('retry')">
      {{ retryLabel }}
    </ion-button>
  </div>
</template>

<script setup lang="ts">
// Small, reusable error display. Data-layer errors (e.g. ApiError from
// services/apiClient.ts, see master-plan §6.3) are normalized to a
// friendly string here so every feature page renders errors consistently.
import { IonButton, IonIcon } from '@ionic/vue';
import { alertCircleOutline } from 'ionicons/icons';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** The error to display — an Error, ApiError, string, or unknown caught value. */
    error: unknown;
    /** Fallback text used when `error` can't be turned into a message. */
    fallbackMessage?: string;
    /** Optional label for a retry button; omit to hide the button. */
    retryLabel?: string;
  }>(),
  {
    fallbackMessage: 'Something went wrong. Please try again.',
    retryLabel: undefined,
  },
);

const emit = defineEmits<{ (e: 'retry'): void }>();

const friendlyMessage = computed(() => {
  const { error, fallbackMessage } = props;
  if (typeof error === 'string' && error.trim().length > 0) return error;
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
});
</script>

<style scoped>
.app-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-spacing-sm, 8px);
  padding: var(--app-spacing-lg, 24px);
  text-align: center;
  width: 100%;
}

.app-error ion-icon {
  font-size: 2rem;
}

.app-error__message {
  color: var(--ion-color-danger);
  margin: 0;
}
</style>
