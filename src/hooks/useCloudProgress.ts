import { useCallback, useEffect, useRef, useState } from 'react';
import { commitCloudProgress, saveCloudPatch } from '../lib/cloudProgress';
import type { CloudPatch, CloudSnapshot } from '../lib/cloudProgress';
import type { SessionEntry } from '../lib/storage';

type Operation =
  | { patch: CloudPatch }
  | { session?: SessionEntry; generation?: number };

export function useCloudProgress(userId: string, initial?: CloudSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const snapshotRef = useRef(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const pending = useRef<Operation[]>([]);
  const mounted = useRef(false);
  const running = useRef(false);
  const stalled = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current.length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeunload', warn);
    };
  }, []);

  const flush = useCallback(async () => {
    if (running.current || !mounted.current) return;
    running.current = true;
    stalled.current = false;
    setFailed(false);
    setSaving(true);
    try {
      while (mounted.current && pending.current.length) {
        const operation = pending.current[0];
        if ('patch' in operation) {
          await saveCloudPatch(userId, operation.patch);
        } else {
          operation.generation ??= snapshotRef.current!.generation;
          const result = await commitCloudProgress(userId, operation.generation, operation.session);
          snapshotRef.current = result;
          if (mounted.current) {
            setSnapshot(result);
            if (operation.session && result.generation !== operation.generation) setDiscarded(true);
          }
        }
        pending.current.shift();
      }
    } catch {
      stalled.current = true;
      if (mounted.current) setFailed(true);
    } finally {
      running.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [userId]);

  const enqueue = useCallback((operation: Operation) => {
    if (!initial || !mounted.current) return;
    pending.current.push(operation);
    if (!stalled.current) void flush();
  }, [initial, flush]);

  const patch = useCallback((value: CloudPatch) => enqueue({ patch: value }), [enqueue]);
  const record = useCallback((session: SessionEntry) => enqueue({ session }), [enqueue]);
  const reset = useCallback(() => enqueue({}), [enqueue]);
  const hasPending = useCallback(() => pending.current.length > 0, []);
  return { snapshot, saving, failed, discarded, patch, record, reset, retry: flush, hasPending };
}
