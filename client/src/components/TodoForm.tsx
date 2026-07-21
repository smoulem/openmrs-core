import { useState, type FormEvent } from 'react';

interface TodoFormProps {
  onSubmit: (text: string) => void;
}

export function TodoForm({ onSubmit }: TodoFormProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="todo-form-input"
        placeholder="What needs to be done?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button type="submit" className="todo-form-button" disabled={!text.trim()}>
        Add
      </button>
    </form>
  );
}
