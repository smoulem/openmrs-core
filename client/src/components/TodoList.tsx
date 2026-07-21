import type { Todo, FilterType } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  pendingIds: Set<string>;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function TodoList({
  todos,
  pendingIds,
  filter,
  onFilterChange,
  onToggle,
  onDelete,
  onEdit,
}: TodoListProps) {
  const filteredTodos = todos.filter((t) => {
    if (t.deletedAt) return false;
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed && !t.deletedAt).length;
  const completedCount = todos.filter((t) => t.completed && !t.deletedAt).length;

  const filters: FilterType[] = ['all', 'active', 'completed'];

  return (
    <div className="todo-list-container">
      <div className="todo-filters">
        {filters.map((f) => (
          <button
            key={f}
            className={`todo-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && activeCount > 0 && (
              <span className="filter-count"> {activeCount}</span>
            )}
            {f === 'completed' && completedCount > 0 && (
              <span className="filter-count"> {completedCount}</span>
            )}
          </button>
        ))}
      </div>

      {filteredTodos.length === 0 ? (
        <p className="todo-empty">
          {filter === 'all'
            ? 'No todos yet. Add one above!'
            : filter === 'active'
              ? 'No active todos.'
              : 'No completed todos.'}
        </p>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isPending={pendingIds.has(todo.id)}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
