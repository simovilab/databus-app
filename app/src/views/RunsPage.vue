<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Carreras</ion-title>
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
          title="Sin carrera activa"
          message="Cuando esté listo, inicie una carrera programada y empezamos a transmitir telemetría."
        >
          <template #action>
            <ion-button
              data-testid="start-run-cta"
              @click="setupOpen = true"
            >Iniciar carrera</ion-button>
          </template>
        </empty-state>
      </template>

      <!-- Segment: history -->
      <template v-else>
        <ion-refresher slot="fixed" data-testid="history-refresher" @ion-refresh="onRefreshHistory">
          <ion-refresher-content />
        </ion-refresher>
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
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '@/components/ui/EmptyState.vue';
import RunProgress from '@/components/trips/RunProgress.vue';
import TripSetupModal from '@/components/trips/TripSetupModal.vue';
import RunHistoryList from '@/components/runs/RunHistoryList.vue';
import RunDetailsModal from '@/components/runs/RunDetailsModal.vue';
import { useRunStore } from '@/stores/run';
import { useRunHistoryStore } from '@/stores/runHistory';
import type { RunHistoryEntry } from '@/types/domain';

const route = useRoute();
const router = useRouter();
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

/** Pull-to-refresh on the Historial segment — same reconcile() the tab
 * already runs on entry, just operator-triggered. reconcile() swallows its
 * own errors, so the refresher always completes. */
async function onRefreshHistory(event: RefresherCustomEvent): Promise<void> {
  await historyStore.reconcile();
  event.target.complete();
}

// Prune stale entries (runs no longer in the DB) and refresh final states.
// Best-effort — reconcile() swallows its own errors. Runs each time the tab is
// shown and whenever the operator opens the Historial segment.
onIonViewWillEnter(() => {
  void historyStore.reconcile();

  // Home's "Iniciar una carrera" CTA appends ?start=1 to jump straight to the
  // setup form, bypassing whatever segment (Activo/Historial) was last
  // active — the view is kept alive by the tab outlet, so this must be
  // re-checked on every enter, not just on mount.
  if (route.query.start === '1') {
    segment.value = 'active';
    if (!hasActiveRun.value) setupOpen.value = true;
    void router.replace({ path: '/tabs/runs' });
  } else if (route.query.segment === 'active' || route.query.segment === 'history') {
    // Home's active-run card and recent-activity feed link in with
    // ?segment=active|history so they land on the right tab instead of
    // always defaulting to Activo.
    segment.value = route.query.segment;
    void router.replace({ path: '/tabs/runs' });
  }
});
watch(segment, (value) => {
  if (value === 'history') void historyStore.reconcile();
});
</script>
