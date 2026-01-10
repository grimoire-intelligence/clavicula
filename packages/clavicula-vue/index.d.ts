import type { Store, DerivedStore } from 'clavicula';
import type { ShallowRef } from 'vue';

/**
 * Vue composable to subscribe to a Clavicula store.
 * Returns a shallow ref that updates when the store changes.
 */
export function useStore<T extends object>(store: Store<T>): ShallowRef<T>;
export function useStore<T>(store: DerivedStore<T>): ShallowRef<T>;
