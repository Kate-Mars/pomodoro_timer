import { useCallback, useRef, useState } from 'react';
import { loadState, saveState } from '../lib/storage';
import type { LoadResult, PersistedState } from '../lib/storage';

export type PersistedStore = {
  state: PersistedState;
  storageUnavailable: boolean;
  update: (updater: (prev: PersistedState) => PersistedState) => void;
};

export function usePersistedState(
  initial?: PersistedState,
  persist?: (next: PersistedState, previous: PersistedState) => void,
): PersistedStore {
  const initialRef = useRef<LoadResult | null>(null);
  if (initialRef.current === null) {
    initialRef.current = initial ? { state: initial, storageUnavailable: false } : loadState();
  }

  const [state, setState] = useState<PersistedState>(initialRef.current.state);
  const [storageUnavailable, setStorageUnavailable] = useState(initialRef.current.storageUnavailable);
  const stateRef = useRef(state);

  const update = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    const previous = stateRef.current;
    const next = updater(previous);
    stateRef.current = next;
    setState(next);
    if (persist) persist(next, previous);
    else if (!saveState(next)) {
      setStorageUnavailable(true);
    }
  }, [persist]);

  return { state, storageUnavailable, update };
}
