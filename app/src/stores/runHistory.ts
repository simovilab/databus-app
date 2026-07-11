// Run-history store (Pinia setup store). The Databús backend exposes no
// "list my runs" endpoint — the DRF run ViewSet is commented out
// (../databus/backend/api/urls.py) — so the app keeps its own append-only
// history of finished runs, persisted via @capacitor/preferences. The run
// store calls record() when a run reaches a terminal state; the Runs-history
// segment and Home recent-activity feed read `entries`.

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { Preferences } from '@capacitor/preferences';
import { ApiError } from '@/services/apiClient';
import { getRunState } from '@/services/schedule';
import type { RunHistoryEntry, RunState } from '@/types/domain';

const STORAGE_KEY = 'databus.runHistory';
const MAX_ENTRIES = 100;

export const useRunHistoryStore = defineStore('runHistory', () => {
  // Newest first.
  const entries = ref<RunHistoryEntry[]>([]);

  async function loadFromStorage(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      entries.value = Array.isArray(parsed) ? (parsed as RunHistoryEntry[]) : [];
    } catch {
      // Corrupt storage — start clean rather than throwing during boot.
      entries.value = [];
    }
  }

  async function record(entry: RunHistoryEntry): Promise<void> {
    // Prepend (newest first), de-duplicate by runId, cap the log length.
    const withoutDupe = entries.value.filter((e) => e.runId !== entry.runId);
    entries.value = [entry, ...withoutDupe].slice(0, MAX_ENTRIES);
    await persist();
  }

  async function clear(): Promise<void> {
    entries.value = [];
    await Preferences.remove({ key: STORAGE_KEY });
  }

  /**
   * Reconcile the local log against the backend so it only shows runs that
   * still exist in the database. The backend has no run-list endpoint, so we
   * probe each entry's GET /runs/<id>/state/:
   *   - 404            → the run no longer exists → drop it.
   *   - 200            → keep it, and refresh finalState from the DB so the
   *                      badge stays truthful (e.g. a run the engine later
   *                      completed).
   *   - other error    → keep it as-is (transient/offline — don't lose history
   *                      over a network blip).
   * Best-effort and non-fatal: any failure leaves the current log untouched.
   */
  async function reconcile(): Promise<void> {
    if (entries.value.length === 0) return;
    const results = await Promise.all(
      entries.value.map(async (entry) => {
        try {
          const response = await getRunState(entry.runId);
          return { entry, keep: true, state: response.run_lifecycle_state };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            return { entry, keep: false, state: undefined };
          }
          // Transient/offline — keep the entry unchanged.
          return { entry, keep: true, state: undefined };
        }
      }),
    );
    const next = results
      .filter((r) => r.keep)
      .map((r) =>
        r.state && r.state !== r.entry.finalState
          ? { ...r.entry, finalState: r.state as RunState }
          : r.entry,
      );
    // Only write if something actually changed (avoid a needless persist).
    const changed =
      next.length !== entries.value.length ||
      next.some((e, i) => e !== entries.value[i]);
    if (changed) {
      entries.value = next;
      await persist();
    }
  }

  async function persist(): Promise<void> {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(entries.value),
    });
  }

  return { entries, loadFromStorage, record, clear, reconcile };
});
