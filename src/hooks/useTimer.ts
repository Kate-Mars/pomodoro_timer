import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type Timer = {
  status: TimerStatus;
  remainingMs: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (overrideMs?: number) => void;
};

const TICK_MS = 250;

export function useTimer(totalMs: number, onComplete: () => void): Timer {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remainingMs, setRemainingMs] = useState(totalMs);

  const endsAtRef = useRef<number | null>(null);
  const remainingRef = useRef(totalMs);
  const totalRef = useRef(totalMs);
  const onCompleteRef = useRef(onComplete);
  const finishedRef = useRef(false);

  totalRef.current = totalMs;
  remainingRef.current = remainingMs;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;

      const left = endsAt - Date.now();
      if (left <= 0) {
        endsAtRef.current = null;
        setRemainingMs(0);
        setStatus('completed');
        if (!finishedRef.current) {
          finishedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }

      setRemainingMs(left);
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    return () => {
      endsAtRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    finishedRef.current = false;
    endsAtRef.current = Date.now() + totalRef.current;
    setRemainingMs(totalRef.current);
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    const endsAt = endsAtRef.current;
    const left = endsAt === null ? remainingRef.current : Math.max(0, endsAt - Date.now());
    endsAtRef.current = null;
    finishedRef.current = true;
    setRemainingMs(left);
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    finishedRef.current = false;
    endsAtRef.current = Date.now() + remainingRef.current;
    setStatus('running');
  }, []);

  const reset = useCallback((overrideMs?: number) => {
    const total = overrideMs ?? totalRef.current;
    endsAtRef.current = null;
    finishedRef.current = false;
    setRemainingMs(total);
    setStatus('idle');
  }, []);

  return { status, remainingMs, start, pause, resume, reset };
}
