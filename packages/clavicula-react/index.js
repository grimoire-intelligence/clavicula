import { useSyncExternalStore } from 'react';

/**
 * React hook to subscribe to a Clavicula store.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @param {(state: T) => U} [selector] - Optional selector for primitive slices
 * @returns {T | U} Current store state or selected slice
 * @template T, U
 */
export function useStore(store, selector) {
  const getSnapshot = selector
    ? () => selector(store.get())
    : store.get;

  // Wrap subscribe to skip the immediate call (React manages initial state via getSnapshot)
  const subscribe = (onStoreChange) => {
    let first = true;
    return store.subscribe(() => {
      if (first) { first = false; return; }
      onStoreChange();
    });
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
