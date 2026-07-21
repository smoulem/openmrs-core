import { useState } from 'react';
import type { Conflict, Todo } from '../types';

interface ConflictResolutionProps {
  conflicts: Conflict[];
  onResolve: (resolved: Todo[]) => void;
  onDismiss: () => void;
}

interface ConflictState {
  resolution: 'unresolved' | 'keep-server' | 'keep-local' | 'merge';
  mergedText: string;
}

export function ConflictResolution({ conflicts, onResolve, onDismiss }: ConflictResolutionProps) {
  const [states, setStates] = useState<ConflictState[]>(
    conflicts.map(() => ({ resolution: 'unresolved', mergedText: '' }))
  );

  const allResolved = states.every((s) => s.resolution !== 'unresolved');

  const handleResolve = () => {
    const resolved: Todo[] = conflicts.map((conflict, i) => {
      const state = states[i];
      switch (state.resolution) {
        case 'keep-server':
          return conflict.server;
        case 'keep-local':
          return conflict.local;
        case 'merge':
          return { ...conflict.local, text: state.mergedText };
        default:
          return conflict.server;
      }
    });
    onResolve(resolved);
  };

  const updateResolution = (index: number, resolution: ConflictState['resolution']) => {
    setStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, resolution } : s))
    );
  };

  const updateMergedText = (index: number, text: string) => {
    setStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, mergedText: text } : s))
    );
  };

  return (
    <div className="conflict-overlay">
      <div className="conflict-dialog">
        <h2 className="conflict-title">Resolve Conflicts</h2>
        <p className="conflict-description">
          {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found. Choose how to resolve each one.
        </p>

        <div className="conflict-list">
          {conflicts.map((conflict, i) => (
            <div key={conflict.local.id} className="conflict-item">
              <div className="conflict-versions">
                <div className="conflict-version server">
                  <h3>Server Version</h3>
                  <p className="conflict-text">{conflict.server.text}</p>
                  <span className="conflict-meta">
                    v{conflict.server.version} · {new Date(conflict.server.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="conflict-vs">vs</div>
                <div className="conflict-version local">
                  <h3>Your Version</h3>
                  <p className="conflict-text">{conflict.local.text}</p>
                  <span className="conflict-meta">
                    v{conflict.local.version} · {new Date(conflict.local.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="conflict-actions">
                <button
                  className={`conflict-btn ${states[i].resolution === 'keep-server' ? 'selected' : ''}`}
                  onClick={() => updateResolution(i, 'keep-server')}
                >
                  Keep Server
                </button>
                <button
                  className={`conflict-btn ${states[i].resolution === 'keep-local' ? 'selected' : ''}`}
                  onClick={() => updateResolution(i, 'keep-local')}
                >
                  Keep Local
                </button>
                <button
                  className={`conflict-btn ${states[i].resolution === 'merge' ? 'selected' : ''}`}
                  onClick={() => {
                    updateResolution(i, 'merge');
                    if (!states[i].mergedText) {
                      updateMergedText(i, conflict.local.text);
                    }
                  }}
                >
                  Merge
                </button>
              </div>

              {states[i].resolution === 'merge' && (
                <input
                  type="text"
                  className="conflict-merge-input"
                  value={states[i].mergedText || conflict.local.text}
                  onChange={(e) => updateMergedText(i, e.target.value)}
                  placeholder="Enter merged text..."
                />
              )}
            </div>
          ))}
        </div>

        <div className="conflict-footer">
          <button className="conflict-dismiss-btn" onClick={onDismiss}>
            Later
          </button>
          <button
            className="conflict-resolve-btn"
            onClick={handleResolve}
            disabled={!allResolved}
          >
            Resolve All
          </button>
        </div>
      </div>
    </div>
  );
}
