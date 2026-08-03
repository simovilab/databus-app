<template>
  <div class="run-progress">
    <ion-card>
      <ion-card-header class="state-header" :style="{ background: stateTint }">
        <ion-card-title class="state-title">
          <Transition name="state-pop" mode="out-in">
            <ion-badge
              :key="run?.state ?? 'none'"
              :color="stateColor"
              data-testid="run-state-badge"
            >{{ run?.state ?? '—' }}</ion-badge>
          </Transition>
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="full">
          <ion-item>
            <ion-label slot="start" class="detail-label">Ruta</ion-label>
            <ion-label slot="end" data-testid="run-route">{{ routeLabelText }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Viaje</ion-label>
            <ion-label slot="end" data-testid="run-trip">{{ tripLabelText }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Vehículo</ion-label>
            <ion-label slot="end" class="tnum" data-testid="run-vehicle">{{ run?.vehicleId }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Última posición</ion-label>
            <ion-label
              slot="end"
              class="tnum"
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
        Finalizar run
      </ion-button>
      <div v-else class="terminal-actions">
        <Transition name="check-pop">
          <div v-if="showEndPulse" class="success-pulse" aria-hidden="true">
            <ion-icon :icon="checkmarkCircle" color="success" />
          </div>
        </Transition>
        <p class="terminal-note" data-testid="run-terminal-note">
          Este run ha terminado.
        </p>
        <ion-button
          expand="block"
          data-testid="start-new-run-button"
          @click="emit('start-new')"
        >Iniciar un nuevo run</ion-button>
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
import { checkmarkCircle, stopCircleOutline } from 'ionicons/icons';
import { computed, onUnmounted, ref } from 'vue';
import { useRunStore } from '@/stores/run';
import type { RunState } from '@/types/domain';

/** True when the OS asks apps to minimize motion. Used to skip the purely
 * decorative success-pulse delay below — never to skip anything functional. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

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

// Driver-facing labels captured at run creation (readable-labels plan §3).
// Falls back to the raw id — every ActiveRun createRun() produces has these,
// but rendering defensively costs nothing and matches how RunHistoryList /
// RunDetailsModal handle the same (optional) fields on older entries.
const routeLabelText = computed(() => run.value?.routeLabel || run.value?.routeId || '');
const tripLabelText = computed(() => run.value?.tripLabel || run.value?.tripId || '');

const stateColor = computed(() => {
  if (!run.value) return 'medium';
  if (isTerminal.value) return 'medium';
  if (run.value.state === 'In Progress') return 'success';
  if (run.value.state === 'No Signal') return 'warning';
  return 'primary';
});

/** Soft pastel wash behind the state badge — differentiates state inside the
 * card instead of a hard color block (Card Stack principle 1). */
const stateTint = computed(() => `var(--app-tint-${stateColor.value})`);

const showEndPulse = ref(false);

const lastFixText = computed(() => {
  const fix = telemetry.value.lastFix.value;
  if (!fix) return 'Sin posición aún';
  const lat = fix.latitude.toFixed(5);
  const lon = fix.longitude.toFixed(5);
  return `${lat}, ${lon}`;
});

const telemetryLabel = computed(() => {
  switch (telemetry.value.status.value) {
    case 'streaming':
      return 'Transmitiendo';
    case 'buffering':
      return 'Almacenando';
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
    return `Sin conexión, almacenando posiciones localmente (${queued} en espera).`;
  }
  if (status === 'streaming') {
    return `Enviando GPS al broker.${queued > 0 ? ` (${queued} aún en espera)` : ''}`;
  }
  if (status === 'starting') {
    return 'Obteniendo GPS y conectando al broker…';
  }
  if (status === 'unavailable') {
    return 'El reporte de GPS no está disponible en el navegador — usa la app instalada. El run no se ve afectado.';
  }
  if (status === 'error') {
    return 'La telemetría no está disponible. El run continúa; las posiciones se reintentarán.';
  }
  return 'La telemetría está inactiva.';
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
    // Purely decorative confirmation — the terminal state/note above are
    // already correct the instant endRun() resolves, regardless of this.
    showEndPulse.value = true;
    setTimeout(
      () => {
        showEndPulse.value = false;
      },
      prefersReducedMotion() ? 0 : 900,
    );
  } catch (err) {
    endError.value =
      err instanceof Error
        ? err.message
        : 'No se pudo finalizar el run. Intenta de nuevo.';
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

.state-header {
  border-radius: var(--app-radius-xl, 24px) var(--app-radius-xl, 24px) 0 0;
  transition: background-color var(--app-motion-base, 240ms) var(--app-motion-ease, ease);
}

.state-title {
  display: flex;
  align-items: center;
}

/* State-change pulse: the badge is keyed on run.state, so Vue mounts a fresh
   element whenever the lifecycle advances (Confirmed → Tracking → …) and
   this enter animation plays once per transition. */
.state-pop-enter-active {
  animation: state-pop var(--app-motion-base, 240ms) var(--app-motion-ease, ease-out);
}
@keyframes state-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.success-pulse {
  display: flex;
  justify-content: center;
  margin-bottom: var(--app-spacing-xs, 4px);
}

.success-pulse ion-icon {
  font-size: 2rem;
}

.check-pop-enter-active {
  animation: check-pop var(--app-motion-base, 240ms) var(--app-motion-ease, ease-out);
}
.check-pop-leave-active {
  transition: opacity var(--app-motion-fast, 150ms) ease-in;
}
.check-pop-leave-to {
  opacity: 0;
}
@keyframes check-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.detail-label {
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-sm);
}

.telemetry-detail {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-md);
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
