import type { Store, DerivedStore } from 'clavicula';

/**
 * React hook to subscribe to a Clavicula store.
 * Uses useSyncExternalStore for concurrent-safe subscriptions.
 */
export function useStore<T extends object>(store: Store<T>): T;
export function useStore<T>(store: DerivedStore<T>): T;
