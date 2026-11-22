import { useCallback, useState } from 'react';
import {
  DEFAULT_SESSIONS,
  loadSessions,
  saveSessions,
} from '../lib/storage';
import type { SessionEntry, SessionLog } from '../lib/storage';

export type SessionLogApi = {
  items: SessionEntry[];
  stats: SessionLog['stats'];
  record: (entry: Omit<SessionEntry, 'id'>) => void;
  clear: () => void;
};

export function useSessionLog(initial?: SessionLog): SessionLogApi {
  const [log, setLog] = useState<SessionLog>(() => initial ?? loadSessions());

  const record = useCallback((entry: Omit<SessionEntry, 'id'>) => {
    setLog((prev) => {
      const item: SessionEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      const items = [item, ...prev.items].slice(0, 20);
      const stats =
        entry.status === 'completed'
          ? {
              completed: prev.stats.completed + 1,
              totalFocusMs: prev.stats.totalFocusMs + entry.elapsedMs,
            }
          : prev.stats;
      const next: SessionLog = { version: 1, stats, items };
      saveSessions(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    const next: SessionLog = {
      version: 1,
      stats: { ...DEFAULT_SESSIONS.stats },
      items: [],
    };
    setLog(next);
    saveSessions(next);
  }, []);

  return { items: log.items, stats: log.stats, record, clear };
}
