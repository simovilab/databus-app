<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Trips</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <run-progress
        v-if="hasActiveRun"
        @start-new="onStartNew"
      />
      <empty-state
        v-else
        title="No active run"
        message="Start a scheduled run to begin streaming telemetry."
      >
        <template #action>
          <ion-button
            data-testid="start-run-cta"
            @click="setupOpen = true"
          >Start run</ion-button>
        </template>
      </empty-state>
    </ion-content>

    <trip-setup-modal
      :is-open="setupOpen"
      @dismissed="setupOpen = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
// Trips page: switches on useRunStore().activeRun.
//   - no active run → "Start run" CTA opening TripSetupModal
//   - active run   → RunProgress (read-only telemetry + lifecycle poll)
// The modal creates + confirms the run; once activeRun is set, the page
// re-renders into RunProgress automatically.
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { computed, ref } from 'vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import RunProgress from '@/components/trips/RunProgress.vue';
import TripSetupModal from '@/components/trips/TripSetupModal.vue';
import { useRunStore } from '@/stores/run';

const runStore = useRunStore();
const setupOpen = ref(false);

// A run is "active" while present in the store. Once endRun() resolves the
// store keeps the terminal run so RunProgress shows the final state; the
// operator can start a new run from the terminal view.
const hasActiveRun = computed(() => runStore.activeRun !== null);

/**
 * Clears a terminal run so the empty state (with the Start run CTA) shows
 * again, then opens the setup modal. The run store has no explicit clear
 * method (A2 contract), so the terminal run is dropped by direct state
 * assignment — Pinia setup-store refs are writable from the consumer.
 */
function onStartNew(): void {
  runStore.activeRun = null;
  setupOpen.value = true;
}
</script>
