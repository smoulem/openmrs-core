import { useState } from 'react';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  isPending: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function TodoItem({ todo, isPending, onToggle, onDelete, onEdit }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditText(todo.text);
      setEditing(false);
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''} ${isPending ? 'pending' : ''}`}>
      <label className="todo-item-checkbox-label">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="todo-item-checkbox"
        />
        <span className="todo-item-checkmark" />
      </label>

      {editing ? (
        <input
          type="text"
          className="todo-item-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span
          className="todo-item-text"
          onClick={() => {
            setEditText(todo.text);
            setEditing(true);
          }}
        >
          {todo.text}
        </span>
      )}

      {isPending && <span className="todo-item-pending-badge" title="Not yet synced">⧖</span>}

      <button
        className="todo-item-delete"
        onClick={() => onDelete(todo.id)}
        title="Delete"
      >
        ×
      </button>
    </li>
  );
}
