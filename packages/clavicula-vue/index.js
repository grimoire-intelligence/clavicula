import { shallowRef, onUnmounted } from 'vue';

/**
 * Vue composable to subscribe to a Clavicula store.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @returns {import('vue').ShallowRef<T>} Reactive ref with current store state
 * @template T
 */
export function useStore(store) {
  const state = shallowRef(store.get());
  const unsub = store.subscribe(val => { state.value = val; });
  onUnmounted(unsub);
  return state;
}
