import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, FilterType } from './types';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from './services/api';
import { saveTodos, loadTodos, addPendingChange, clearPendingChanges, getPendingChangeCount } from './services/offline';
import { syncWithServer, getConflicts, clearConflicts, setConflicts } from './services/sync';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { SyncStatus } from './components/SyncStatus';
import { ConflictResolution } from './components/ConflictResolution';
import type { Conflict } from './types';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflictsState] = useState<Conflict[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();
  const prevOnline = useRef<boolean | null>(null);

  // Load todos on mount
  useEffect(() => {
    const init = async () => {
      if (isOnline) {
        try {
          const serverTodos = await fetchTodos();
          setTodos(serverTodos);
          saveTodos(serverTodos);
        } catch {
          // Server unavailable, fall back to localStorage
          setTodos(loadTodos());
        }
      } else {
        setTodos(loadTodos());
      }
      // Load pending IDs from localStorage
      const pending = JSON.parse(localStorage.getItem('todos_pending') || '[]') as Todo[];
      setPendingIds(new Set(pending.map((p) => p.id)));
      setLoading(false);
    };
    init();
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (prevOnline.current === false && isOnline) {
      handleSync();
    }
    prevOnline.current = isOnline;
  }, [isOnline]);

  const handleSync = useCallback(async () => {
    const newConflicts = await syncWithServer(todos);
    if (newConflicts.length > 0) {
      setConflictsState(newConflicts);
      setConflicts(newConflicts);
      setShowConflicts(true);
    }
    // Refresh todos from server after sync
    try {
      const serverTodos = await fetchTodos();
      setTodos(serverTodos);
      saveTodos(serverTodos);
    } catch {
      // ignore
    }
    // Refresh pending state
    const pending = JSON.parse(localStorage.getItem('todos_pending') || '[]') as Todo[];
    setPendingIds(new Set(pending.map((p) => p.id)));
  }, [todos]);

  const handleAdd = useCallback(async (text: string) => {
    const now = new Date().toISOString();
    const todo: Todo = {
      id: uuidv4(),
      text,
      completed: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
    };

    if (isOnline) {
      try {
        const created = await createTodo(todo);
        setTodos((prev) => {
          const updated = [...prev, created];
          saveTodos(updated);
          return updated;
        });
        return;
      } catch {
        // Fall through to offline mode
      }
    }

    // Offline: save locally, mark as pending
    setTodos((prev) => {
      const updated = [...prev, todo];
      saveTodos(updated);
      return updated;
    });
    addPendingChange(todo);
    setPendingIds((prev) => new Set(prev).add(todo.id));
  }, [isOnline]);

  const handleToggle = useCallback(async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updatedTodo = {
      ...todo,
      completed: !todo.completed,
      updatedAt: new Date().toISOString(),
      version: todo.version + 1,
    };

    if (isOnline) {
      try {
        await updateTodo(id, { completed: updatedTodo.completed, updatedAt: updatedTodo.updatedAt, version: updatedTodo.version });
        setTodos((prev) => {
          const updated = prev.map((t) => (t.id === id ? updatedTodo : t));
          saveTodos(updated);
          return updated;
        });
        return;
      } catch {
        // Fall through to offline
      }
    }

    // Offline
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? updatedTodo : t));
      saveTodos(updated);
      return updated;
    });
    addPendingChange(updatedTodo);
    setPendingIds((prev) => new Set(prev).add(id));
  }, [todos, isOnline]);

  const handleDelete = useCallback(async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const now = new Date().toISOString();
    const deletedTodo = {
      ...todo,
      deletedAt: now,
      updatedAt: now,
      version: todo.version + 1,
    };

    if (isOnline) {
      try {
        await deleteTodo(id);
        setTodos((prev) => {
          const updated = prev.filter((t) => t.id !== id);
          saveTodos(updated);
          return updated;
        });
        return;
      } catch {
        // Fall through to offline
      }
    }

    // Offline: soft-delete locally
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? deletedTodo : t));
      saveTodos(updated);
      return updated;
    });
    addPendingChange(deletedTodo);
    setPendingIds((prev) => new Set(prev).add(id));
  }, [todos, isOnline]);

  const handleEdit = useCallback(async (id: string, text: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const updatedTodo = {
      ...todo,
      text,
      updatedAt: new Date().toISOString(),
      version: todo.version + 1,
    };

    if (isOnline) {
      try {
        await updateTodo(id, { text, updatedAt: updatedTodo.updatedAt, version: updatedTodo.version });
        setTodos((prev) => {
          const updated = prev.map((t) => (t.id === id ? updatedTodo : t));
          saveTodos(updated);
          return updated;
        });
        return;
      } catch {
        // Fall through to offline
      }
    }

    // Offline
    setTodos((prev) => {
      const updated = prev.map((t) => (t.id === id ? updatedTodo : t));
      saveTodos(updated);
      return updated;
    });
    addPendingChange(updatedTodo);
    setPendingIds((prev) => new Set(prev).add(id));
  }, [todos, isOnline]);

  const handleResolveConflicts = useCallback(async (resolved: Todo[]) => {
    // Update local todos with resolved versions
    setTodos((prev) => {
      const resolvedIds = new Set(resolved.map((r) => r.id));
      const updated = prev.map((t) => (resolvedIds.has(t.id) ? resolved.find((r) => r.id === t.id) || t : t));
      saveTodos(updated);
      return updated;
    });

    // Clear pending changes for resolved items
    clearPendingChanges();
    setPendingIds(new Set());

    // Send resolved todos to server
    if (isOnline) {
      try {
        // For each resolved todo, update it on the server
        for (const todo of resolved) {
          await updateTodo(todo.id, todo);
        }
      } catch {
        // Will retry on next sync
      }
    }

    clearConflicts();
    setConflictsState([]);
    setShowConflicts(false);
  }, [isOnline]);

  const handleDismissConflicts = useCallback(() => {
    setShowConflicts(false);
  }, []);

  const handleOpenConflicts = useCallback(() => {
    setConflictsState(getConflicts());
    setShowConflicts(true);
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const conflictCount = conflicts.length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo App</h1>
      </header>

      <SyncStatus
        isOnline={isOnline}
        pendingCount={getPendingChangeCount()}
        conflictCount={conflictCount}
        onSyncNow={handleSync}
        onResolveConflicts={handleOpenConflicts}
      />

      <main className="app-main">
        <TodoForm onSubmit={handleAdd} />
        <TodoList
          todos={todos}
          pendingIds={pendingIds}
          filter={filter}
          onFilterChange={setFilter}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </main>

      {showConflicts && conflicts.length > 0 && (
        <ConflictResolution
          conflicts={conflicts}
          onResolve={handleResolveConflicts}
          onDismiss={handleDismissConflicts}
        />
      )}
    </div>
  );
}
