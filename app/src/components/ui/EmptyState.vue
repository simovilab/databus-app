<template>
  <div class="empty-state">
    <span class="empty-state__badge" :style="{ background: tintVar }" aria-hidden="true">
      <ion-icon :icon="icon ?? fileTrayOutline" :style="{ color: accentVar }" />
      <ion-icon class="empty-state__sparkle" :icon="sparklesOutline" :style="{ color: accentVar }" />
    </span>
    <h2 class="empty-state__title">{{ title }}</h2>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Small, reusable "nothing here yet" placeholder for empty lists (no active
// run, no messages, no history, …). Card Stack rework (plan-c-cardstack.md
// principle 4): a simple two-icon composition on a soft pastel badge instead
// of a single flat gray glyph — still Ionicons only, no illustration asset.
import { IonIcon } from '@ionic/vue';
import { fileTrayOutline, sparklesOutline } from 'ionicons/icons';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Short heading, e.g. "No active run". */
    title: string;
    /** Optional supporting copy. */
    message?: string;
    /** Optional ionicons icon override (defaults to a tray icon). */
    icon?: string;
    /** Accent used for the badge tint + icon color (defaults to primary). */
    accent?: 'primary' | 'tertiary' | 'medium';
  }>(),
  { accent: 'primary' },
);

const tintVar = computed(() => `var(--app-tint-${props.accent})`);
const accentVar = computed(() => `var(--ion-color-${props.accent})`);
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

.empty-state__badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-bottom: var(--app-spacing-xs, 4px);
}

.empty-state__badge ion-icon:first-child {
  font-size: 2.25rem;
}

.empty-state__sparkle {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 1rem;
  opacity: 0.85;
}

.empty-state__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state__message {
  margin: 0;
  color: var(--ion-color-medium);
  line-height: var(--app-line-height-relaxed, 1.55);
}

.empty-state__action {
  margin-top: var(--app-spacing-sm, 8px);
}
</style>
