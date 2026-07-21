import type { Todo } from '../types';

const TODOS_KEY = 'todos_cache';
const PENDING_KEY = 'todos_pending';

export function saveTodos(todos: Todo[]): void {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

export function loadTodos(): Todo[] {
  const raw = localStorage.getItem(TODOS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

export function getPendingChanges(): Todo[] {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

export function addPendingChange(todo: Todo): void {
  const pending = getPendingChanges();
  const existing = pending.findIndex((p) => p.id === todo.id);
  if (existing >= 0) {
    pending[existing] = todo;
  } else {
    pending.push(todo);
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function removePendingChange(id: string): void {
  const pending = getPendingChanges();
  const filtered = pending.filter((p) => p.id !== id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(filtered));
}

export function clearPendingChanges(): void {
  localStorage.removeItem(PENDING_KEY);
}

export function getPendingChangeCount(): number {
  return getPendingChanges().length;
}
