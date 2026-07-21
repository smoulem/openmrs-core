import type { Todo, Conflict } from '../types';
import { syncTodos } from './api';
import { getPendingChanges, clearPendingChanges, saveTodos } from './offline';

let unresolvedConflicts: Conflict[] = [];

export function getConflicts(): Conflict[] {
  return unresolvedConflicts;
}

export function setConflicts(conflicts: Conflict[]): void {
  unresolvedConflicts = conflicts;
}

export function hasConflicts(): boolean {
  return unresolvedConflicts.length > 0;
}

export function clearConflicts(): void {
  unresolvedConflicts = [];
}

export async function syncWithServer(currentTodos: Todo[]): Promise<Conflict[]> {
  const pending = getPendingChanges();
  if (pending.length === 0) {
    return [];
  }

  try {
    const result = await syncTodos(pending);

    if (result.conflicts && result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      return result.conflicts;
    }

    // Merge synced todos with current list
    const syncedMap = new Map<string, Todo>();
    for (const t of currentTodos) syncedMap.set(t.id, t);
    for (const t of result.synced) syncedMap.set(t.id, t);
    const merged = Array.from(syncedMap.values());
    saveTodos(merged);
    clearPendingChanges();

    return [];
  } catch {
    // If sync fails (network error etc.), keep pending changes
    return [];
  }
}

export async function resolveConflict(
  conflict: Conflict,
  resolution: 'keep-server' | 'keep-local' | { mergedText: string }
): Promise<Todo> {
  if (resolution === 'keep-server') {
    return conflict.server;
  }
  if (resolution === 'keep-local') {
    return conflict.local;
  }
  // merge: use local version but with merged text
  return {
    ...conflict.local,
    text: resolution.mergedText,
  };
}
