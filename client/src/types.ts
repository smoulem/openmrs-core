export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
}

export interface Conflict {
  server: Todo;
  local: Todo;
}

export interface SyncResult {
  synced: Todo[];
  conflicts: Conflict[];
}

export type FilterType = 'all' | 'active' | 'completed';
