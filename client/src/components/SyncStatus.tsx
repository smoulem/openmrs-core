import { useState, useEffect } from 'react';

interface SyncStatusProps {
  isOnline: boolean;
  pendingCount: number;
  conflictCount: number;
  onSyncNow: () => void;
  onResolveConflicts: () => void;
}

export function SyncStatus({
  isOnline,
  pendingCount,
  conflictCount,
  onSyncNow,
  onResolveConflicts,
}: SyncStatusProps) {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('last_sync_time');
    if (stored) setLastSync(stored);
  }, []);

  const updateLastSync = () => {
    const now = new Date().toLocaleTimeString();
    localStorage.setItem('last_sync_time', now);
    setLastSync(now);
  };

  const handleSyncNow = () => {
    onSyncNow();
    updateLastSync();
  };

  return (
    <div className={`sync-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="sync-status-left">
        <span className={`sync-indicator ${isOnline ? 'online' : 'offline'}`} />
        <span className="sync-label">
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {lastSync && (
          <span className="sync-last-time">Last sync: {lastSync}</span>
        )}
      </div>
      <div className="sync-status-right">
        {pendingCount > 0 && (
          <span className="sync-pending-count">{pendingCount} pending</span>
        )}
        {conflictCount > 0 && (
          <button className="sync-conflict-btn" onClick={onResolveConflicts}>
            ⚠ {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
          </button>
        )}
        {isOnline && (
          <button className="sync-now-btn" onClick={handleSyncNow}>
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}
