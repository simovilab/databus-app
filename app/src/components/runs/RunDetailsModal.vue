<template>
  <!-- Max breakpoint must be 1: Ionic only enables ion-content scrolling at the
       max breakpoint, and presents a breakpoint by translating the (always
       ~full-height) wrapper down by (1 - breakpoint) — so a max of 0.92 left
       the last ~8% of the detail list permanently below the viewport. Same
       defect that hid TripSetupModal's footer button. -->
  <ion-modal
    class="sheet-modal"
    :is-open="isOpen"
    :breakpoints="[0, 0.5, 1]"
    :initial-breakpoint="1"
    role="dialog"
    aria-label="Run details"
    @did-dismiss="onDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Detalle del run</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="run-details-close" @click="onDismiss">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <template v-if="entry">
        <ion-list lines="full">
          <ion-item>
            <ion-label slot="start" class="detail-label">Estado final</ion-label>
            <ion-badge slot="end" :color="stateColor(entry.finalState)">{{ translateRunState(entry.finalState) }}</ion-badge>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Ruta</ion-label>
            <ion-label slot="end" class="detail-value">
              <span>{{ entry.routeLabel || entry.routeId }}</span>
              <span class="detail-raw-id">{{ entry.routeId }}</span>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Viaje</ion-label>
            <ion-label slot="end" class="detail-value">
              <span>{{ entry.tripLabel || entry.tripId }}</span>
              <span class="detail-raw-id tnum">{{ entry.tripId }}</span>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Vehículo</ion-label>
            <ion-label slot="end" class="tnum">{{ entry.vehicleId }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Inicio</ion-label>
            <ion-label slot="end" class="tnum">{{ formatDateTime(entry.startedAt) }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label slot="start" class="detail-label">Fin</ion-label>
            <ion-label slot="end" class="tnum">{{ formatDateTime(entry.endedAt) }}</ion-label>
          </ion-item>
        </ion-list>

        <ion-button
          fill="outline"
          expand="block"
          data-testid="toggle-timeline"
          @click="timelineOpen = !timelineOpen"
        >{{ timelineOpen ? 'Ocultar bitácora de estados' : 'Ver bitácora de estados' }}</ion-button>

        <template v-if="timelineOpen">
          <h2 class="section-title">Bitácora de estados</h2>
          <app-loading v-if="loading" message="Cargando bitácora…" />
          <app-error
            v-else-if="error"
            :error="error"
            fallback-message="No se pudo cargar la bitácora del run."
            retry-label="Reintentar"
            @retry="loadTimeline"
          />
          <ion-list v-else-if="transitions.length" lines="full">
            <ion-item v-for="(t, i) in transitions" :key="i" data-testid="timeline-row">
              <ion-label>
                <h3>{{ translateRunState(t.from_state) }} → {{ translateRunState(t.to_state) }}</h3>
                <p>{{ t.event }} · {{ formatDateTime(t.timestamp) }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <p v-else class="detail-empty">Sin transiciones registradas.</p>
        </template>
      </template>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Run-details modal: shows a finished run's local record plus its live FSM
// timeline fetched from GET /runs/<id>/history/ (services/schedule.getRunHistory).
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { ref, watch } from 'vue';
import AppError from '@/components/ui/AppError.vue';
import AppLoading from '@/components/ui/AppLoading.vue';
import { getRunHistory } from '@/services/schedule';
import { translateRunState } from '@/utils/runStateLabels';
import type { RunHistoryTransition } from '@/types/api';
import type { RunHistoryEntry, RunState } from '@/types/domain';

const props = defineProps<{ isOpen: boolean; entry: RunHistoryEntry | null }>();
const emit = defineEmits<{ (e: 'dismissed'): void }>();

const timelineOpen = ref(false);
const loading = ref(false);
const error = ref<unknown>(null);
const transitions = ref<RunHistoryTransition[]>([]);

// Bitácora de estados is collapsed by default (only loaded once the operator
// asks to see it) and resets whenever a new entry is opened.
watch(
  () => [props.isOpen, props.entry?.runId],
  () => {
    timelineOpen.value = false;
    transitions.value = [];
    error.value = null;
  },
);

watch(timelineOpen, (open) => {
  if (open && props.entry) void loadTimeline();
});

async function loadTimeline(): Promise<void> {
  if (!props.entry) return;
  error.value = null;
  loading.value = true;
  transitions.value = [];
  try {
    const response = await getRunHistory(props.entry.runId);
    transitions.value = response.transitions;
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

function onDismiss(): void {
  emit('dismissed');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function stateColor(state: RunState): 'success' | 'warning' | 'danger' | 'medium' {
  if (state === 'Completed') return 'success';
  if (state === 'Interrupted' || state === 'Short Turned') return 'warning';
  if (state === 'Cancelled') return 'danger';
  return 'medium';
}
</script>

<style scoped>
.detail-label {
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-sm);
}

/* Ruta/Viaje rows: the readable label as the primary line, with the raw
   GTFS id kept reachable underneath in small monospace — this is the
   diagnostics screen, so the id is worth keeping even though the label is
   what a driver actually reads (readable-labels plan §3). */
.detail-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.detail-raw-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--app-font-size-xs);
  color: var(--ion-color-medium);
}

.section-title {
  margin: var(--app-spacing-lg, 24px) 0 var(--app-spacing-sm, 8px);
  font-size: var(--app-font-size-lg);
  font-weight: var(--app-font-weight-semibold);
}

.detail-empty {
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-md);
}
</style>
