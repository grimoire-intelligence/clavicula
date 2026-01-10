import type { Store, DerivedStore } from 'clavicula';
import type { Accessor } from 'solid-js';

/**
 * Solid primitive to subscribe to a Clavicula store.
 * Returns an Accessor that updates when the store changes.
 */
export function useStore<T extends object>(store: Store<T>): Accessor<T>;
export function useStore<T>(store: DerivedStore<T>): Accessor<T>;
