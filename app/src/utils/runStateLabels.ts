// Spanish display labels for run lifecycle states. The app's copy is Spanish
// throughout, but "run" itself is kept in English by convention (see
// HomePage.vue, RunsPage.vue) — only the state values are translated.
import type { RunState } from '@/types/domain';

const RUN_STATE_LABELS_ES: Record<RunState, string> = {
  Requested: 'Solicitado',
  Validated: 'Validado',
  Initialized: 'Inicializado',
  Confirmed: 'Confirmado',
  Tracking: 'Rastreando',
  'In Progress': 'En progreso',
  'No Signal': 'Sin señal',
  Completed: 'Completado',
  Cancelled: 'Cancelado',
  Interrupted: 'Interrumpido',
  'Short Turned': 'Recorrido acortado',
};

/**
 * Translates a run state to Spanish for display. Falls back to the raw value
 * for strings that aren't a known RunState (e.g. transition event names).
 */
export function translateRunState(state: string): string {
  return RUN_STATE_LABELS_ES[state as RunState] ?? state;
}
