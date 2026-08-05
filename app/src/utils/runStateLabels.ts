// Spanish display labels for run lifecycle states. The app's copy is Spanish
// throughout, and "run" is rendered as "carrera" in user-facing text — only
// the RunState values below (the backend's FSM state names) stay in English,
// since they are internal identifiers, not display text.
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
