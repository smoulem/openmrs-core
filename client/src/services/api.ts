import type { Todo, SyncResult } from '../types';

const BASE = '/api/todos';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTodos(): Promise<Todo[]> {
  return request<Todo[]>(BASE);
}

export async function createTodo(todo: Todo): Promise<Todo> {
  return request<Todo>(BASE, {
    method: 'POST',
    body: JSON.stringify(todo),
  });
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
  return request<Todo>(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await request<void>(`${BASE}/${id}`, {
    method: 'DELETE',
  });
}

export async function syncTodos(todos: Todo[]): Promise<SyncResult> {
  return request<SyncResult>(`${BASE}/sync`, {
    method: 'POST',
    body: JSON.stringify({ todos }),
  });
}
