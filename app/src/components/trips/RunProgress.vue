<template>
  <div class="run-progress">
    <ion-card>
      <ion-card-header>
        <ion-card-title class="state-title">
          <ion-badge
            :color="stateColor"
            data-testid="run-state-badge"
          >{{ run?.state ? translateRunState(run.state) : '—' }}</ion-badge>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="full">
          <ion-item>
            <ion-label slot="start" class="detail-label">Route</ion-label>
            <ion-label slot="end" data-testid="run-route">{{ run?.routeId }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Trip</ion-label>
            <ion-label slot="end" data-testid="run-trip">{{ run?.tripId }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Vehicle</ion-label>
            <ion-label slot="end" data-testid="run-vehicle">{{ run?.vehicleId }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Last fix</ion-label>
            <ion-label
              slot="end"
              data-testid="run-last-fix"
            >{{ lastFixText }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title class="state-title">
          <ion-badge
            :color="telemetryColor"
            data-testid="telemetry-status-badge"
          >{{ telemetryLabel }}</ion-badge>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="telemetry-detail" data-testid="telemetry-detail">
          {{ telemetryDetail }}
        </p>
      </ion-card-content>
    </ion-card>

    <div class="run-actions">
      <ion-button
        v-if="!isTerminal"
        expand="block"
        color="danger"
        data-testid="end-run-button"
        :disabled="ending"
        @click="onEndRun"
      >
        <ion-icon slot="start" :icon="stopCircleOutline" />
        End run
      </ion-button>
      <div v-else class="terminal-actions">
        <p class="terminal-note" data-testid="run-terminal-note">
          This run has ended.
        </p>
        <ion-button
          expand="block"
          data-testid="start-new-run-button"
          @click="emit('start-new')"
        >Start a new run</ion-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// RunProgress is READ-ONLY over telemetry (master §6.6). The run store owns
// telemetry start (on createRun/confirm) and stop (on endRun) so background
// telemetry survives this screen unmounting. This component only:
//   - displays runStore.telemetry.status/lastFix/queuedCount,
//   - polls runStore.refreshState() every ~5s to show lifecycle progress,
//   - offers End run → runStore.endRun() (which stops telemetry).
// Only the poll interval is cleared on unmount — telemetry is NOT stopped
// here (the run may still be active in the background).
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/vue';
import { stopCircleOutline } from 'ionicons/icons';
import { computed, onUnmounted, ref } from 'vue';
import { useRunStore } from '@/stores/run';
import { translateRunState } from '@/utils/runStateLabels';
import type { RunState } from '@/types/domain';

const POLL_INTERVAL_MS = 5000;

/** States that mean the run is over — no polling, show terminal copy. */
const TERMINAL_STATES: ReadonlySet<RunState> = new Set([
  'Completed',
  'Cancelled',
  'Interrupted',
  'Short Turned',
]);

const emit = defineEmits<{
  (e: 'start-new'): void;
}>();

const runStore = useRunStore();

const ending = ref(false);
const endError = ref<string | null>(null);

const run = computed(() => runStore.activeRun);
const telemetry = computed(() => runStore.telemetry);

const isTerminal = computed(
  () => (run.value?.state ? TERMINAL_STATES.has(run.value.state) : false),
);

const stateColor = computed(() => {
  if (!run.value) return 'medium';
  if (isTerminal.value) return 'medium';
  if (run.value.state === 'In Progress') return 'success';
  if (run.value.state === 'No Signal') return 'warning';
  return 'primary';
});

const lastFixText = computed(() => {
  const fix = telemetry.value.lastFix.value;
  if (!fix) return 'No fix yet';
  const lat = fix.latitude.toFixed(5);
  const lon = fix.longitude.toFixed(5);
  return `${lat}, ${lon}`;
});

const telemetryLabel = computed(() => {
  switch (telemetry.value.status.value) {
    case 'streaming':
      return 'Transmitiendo';
    case 'buffering':
      return 'En búfer';
    case 'starting':
      return 'Conectando…';
    case 'unavailable':
      return 'No disponible';
    case 'error':
      return 'Sin conexión';
    default:
      return 'Sin conexión';
  }
});

const telemetryColor = computed(() => {
  switch (telemetry.value.status.value) {
    case 'streaming':
      return 'success';
    case 'buffering':
      return 'warning';
    case 'starting':
      return 'primary';
    case 'unavailable':
      // Not danger: nothing is broken and there is nothing to retry. This build
      // simply has no transport, and the run itself is unaffected.
      return 'medium';
    default:
      return 'danger';
  }
});

const telemetryDetail = computed(() => {
  const status = telemetry.value.status.value;
  const queued = telemetry.value.queuedCount.value;
  if (status === 'buffering') {
    return `Offline, queuing fixes locally (${queued} queued).`;
  }
  if (status === 'streaming') {
    return `Publishing GPS to the broker.${queued > 0 ? ` (${queued} still queued)` : ''}`;
  }
  if (status === 'starting') {
    return 'Acquiring GPS and connecting to the broker…';
  }
  if (status === 'unavailable') {
    return 'GPS reporting is not available in the browser — use the installed app. The run is unaffected.';
  }
  if (status === 'error') {
    return 'Telemetry is unavailable. The run continues; fixes will retry.';
  }
  return 'Telemetry is idle.';
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function poll(): Promise<void> {
  if (isTerminal.value || !run.value) return;
  try {
    await runStore.refreshState();
  } catch {
    // Swallow polling errors — the UI keeps showing the last known state.
    // The store remains consistent; the next tick retries.
  }
}

function startPolling(): void {
  stopPolling();
  pollTimer = setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function onEndRun(): Promise<void> {
  if (ending.value || !run.value) return;
  ending.value = true;
  endError.value = null;
  try {
    // endRun picks cancel_run / run_interrupted from the current state (an
    // operator can't force run_completed — that's the system's terminal-stop
    // event), then stops telemetry (master §6.6).
    await runStore.endRun();
    // One final refresh so the terminal state is reflected immediately.
    stopPolling();
  } catch (err) {
    endError.value =
      err instanceof Error
        ? err.message
        : 'Could not end the run. Please try again.';
  } finally {
    ending.value = false;
  }
}

startPolling();

// ONLY the poll interval is cleared on unmount. Telemetry is intentionally
// left running — the store owns its lifecycle and the run may still be
// active in the background (master §6.6).
onUnmounted(stopPolling);
</script>

<style scoped>
.run-progress {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-md, 16px);
}

.state-title {
  display: flex;
  align-items: center;
}

.detail-label {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}

.telemetry-detail {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.run-actions {
  margin-top: var(--app-spacing-sm, 8px);
}

.terminal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm, 8px);
  margin-top: var(--app-spacing-sm, 8px);
}

.terminal-note {
  margin: 0;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
