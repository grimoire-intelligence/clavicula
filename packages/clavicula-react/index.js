import { useSyncExternalStore } from 'react';

/**
 * React hook to subscribe to a Clavicula store.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @returns {T} Current store state
 * @template T
 */
export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
