<template>
  <div>
    <empty-state
      v-if="entries.length === 0"
      title="Aún no hay runs por aquí"
      :message="emptyMessage"
      :icon="timeOutline"
      accent="medium"
    />
    <ion-list v-else lines="none" class="history-list">
      <ion-item
        v-for="entry in visibleEntries"
        :key="entry.runId"
        button
        detail
        class="history-row"
        data-testid="run-history-row"
        @click="emit('select', entry)"
      >
        <ion-label>
          <h2>{{ entryRouteLabel(entry) }} · {{ entryTripLabel(entry) }}</h2>
          <p class="tnum">{{ formatDateTime(entry.endedAt) }}</p>
        </ion-label>
        <ion-badge slot="end" :color="stateColor(entry.finalState)">{{ translateRunState(entry.finalState) }}</ion-badge>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
// Reusable list of finished runs from the local run-history store. Used by the
// Runs "Historial" segment (full list) and the Home recent-activity feed
// (limited via `max`). Emits `select` with the tapped entry so the host can
// open RunDetailsModal.
import { IonBadge, IonItem, IonLabel, IonList } from '@ionic/vue';
import { timeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { translateRunState } from '@/utils/runStateLabels';
import type { RunHistoryEntry, RunState } from '@/types/domain';

const props = withDefaults(
  defineProps<{
    entries: RunHistoryEntry[];
    max?: number;
    emptyMessage?: string;
  }>(),
  {
    max: undefined,
    emptyMessage: 'En cuanto termines tu primer run, aparecerá justo aquí.',
  },
);

const emit = defineEmits<{ (e: 'select', entry: RunHistoryEntry): void }>();

const visibleEntries = computed(() =>
  props.max ? props.entries.slice(0, props.max) : props.entries,
);

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

// routeLabel/tripLabel are optional on RunHistoryEntry (readable-labels plan
// §3/§6) — entries already persisted in Capacitor Preferences before this
// change have none. Fall back to the raw id rather than render blank.
function entryRouteLabel(entry: RunHistoryEntry): string {
  return entry.routeLabel || entry.routeId;
}
function entryTripLabel(entry: RunHistoryEntry): string {
  return entry.tripLabel || entry.tripId;
}

function stateColor(state: RunState): 'success' | 'warning' | 'danger' | 'medium' {
  if (state === 'Completed') return 'success';
  if (state === 'Interrupted' || state === 'Short Turned') return 'warning';
  if (state === 'Cancelled') return 'danger';
  return 'medium';
}
</script>

<style scoped>
/* Card Stack: each history entry reads as its own soft row-card rather than a
   plain list line. `native` is the CSS Shadow Part ion-item exposes for
   exactly this kind of external restyling. */
.history-list {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm, 8px);
}

.history-row::part(native) {
  border-radius: var(--app-radius-lg, 16px);
  background: var(--ion-card-background, var(--ion-item-background));
  box-shadow: var(--app-shadow-sm);
  margin-bottom: 0;
}

.history-row {
  --padding-start: var(--app-spacing-md, 16px);
  --inner-padding-end: var(--app-spacing-md, 16px);
}
</style>
