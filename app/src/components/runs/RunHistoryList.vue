<template>
  <div>
    <empty-state
      v-if="entries.length === 0"
      title="Sin runs registrados"
      :message="emptyMessage"
      :icon="timeOutline"
    />
    <ion-list v-else lines="full">
      <ion-item
        v-for="entry in visibleEntries"
        :key="entry.runId"
        button
        detail
        data-testid="run-history-row"
        @click="emit('select', entry)"
      >
        <ion-label>
          <h2>{{ entry.routeId }} · {{ entry.tripId }}</h2>
          <p>{{ formatDateTime(entry.endedAt) }}</p>
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
    emptyMessage: 'Los runs finalizados aparecerán aquí.',
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

function stateColor(state: RunState): 'success' | 'warning' | 'danger' | 'medium' {
  if (state === 'Completed') return 'success';
  if (state === 'Interrupted' || state === 'Short Turned') return 'warning';
  if (state === 'Cancelled') return 'danger';
  return 'medium';
}
</script>
