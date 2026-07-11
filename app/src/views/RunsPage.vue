<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Runs</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="segment" data-testid="runs-segment">
          <ion-segment-button value="active" data-testid="segment-active">
            <ion-label>Activo</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history" data-testid="segment-history">
            <ion-label>Historial</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Segment: active run -->
      <template v-if="segment === 'active'">
        <run-progress
          v-if="hasActiveRun"
          @start-new="onStartNew"
        />
        <empty-state
          v-else
          title="Sin run activo"
          message="Inicia un run programado para comenzar a transmitir telemetría."
        >
          <template #action>
            <ion-button
              data-testid="start-run-cta"
              @click="setupOpen = true"
            >Iniciar run</ion-button>
          </template>
        </empty-state>
      </template>

      <!-- Segment: history -->
      <template v-else>
        <run-history-list
          :entries="historyStore.entries"
          @select="openDetails"
        />
      </template>
    </ion-content>

    <trip-setup-modal
      :is-open="setupOpen"
      @dismissed="setupOpen = false"
    />
    <run-details-modal
      :is-open="detailsOpen"
      :entry="selectedEntry"
      @dismissed="detailsOpen = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
// Runs tab (SITEMAP.md "trips" tab, renamed to Runs). Two segments:
//   - Activo:    the current run (RunProgress) or a Start-run CTA
//   - Historial: finished runs from the local run-history store, tapping one
//                opens RunDetailsModal (live FSM timeline).
// The modal creates + confirms the run; once activeRun is set the Activo
// segment re-renders into RunProgress automatically.
import {
  IonButton,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import RunProgress from '@/components/trips/RunProgress.vue';
import TripSetupModal from '@/components/trips/TripSetupModal.vue';
import RunHistoryList from '@/components/runs/RunHistoryList.vue';
import RunDetailsModal from '@/components/runs/RunDetailsModal.vue';
import { useRunStore } from '@/stores/run';
import { useRunHistoryStore } from '@/stores/runHistory';
import type { RunHistoryEntry } from '@/types/domain';

const runStore = useRunStore();
const historyStore = useRunHistoryStore();

const segment = ref<'active' | 'history'>('active');
const setupOpen = ref(false);
const detailsOpen = ref(false);
const selectedEntry = ref<RunHistoryEntry | null>(null);

const hasActiveRun = computed(() => runStore.activeRun !== null);

function onStartNew(): void {
  runStore.activeRun = null;
  setupOpen.value = true;
}

function openDetails(entry: RunHistoryEntry): void {
  selectedEntry.value = entry;
  detailsOpen.value = true;
}

// Prune stale entries (runs no longer in the DB) and refresh final states.
// Best-effort — reconcile() swallows its own errors. Runs each time the tab is
// shown and whenever the operator opens the Historial segment.
onIonViewWillEnter(() => {
  void historyStore.reconcile();
});
watch(segment, (value) => {
  if (value === 'history') void historyStore.reconcile();
});
</script>
