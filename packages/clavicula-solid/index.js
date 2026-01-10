import { createSignal, onCleanup } from 'solid-js';

/**
 * Solid primitive to subscribe to a Clavicula store.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @returns {import('solid-js').Accessor<T>} Accessor for current store state
 * @template T
 */
export function useStore(store) {
  const [state, setState] = createSignal(store.get());
  const unsub = store.subscribe(setState);
  onCleanup(unsub);
  return state;
}
