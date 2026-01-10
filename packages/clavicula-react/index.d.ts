import type { Store, DerivedStore } from 'clavicula';

/**
 * React hook to subscribe to a Clavicula store.
 * Uses useSyncExternalStore for concurrent-safe subscriptions.
 *
 * @param store - The store to subscribe to
 * @param selector - Optional selector for primitive slices (use `derived` for objects)
 */
export function useStore<T extends object>(store: Store<T>): T;
export function useStore<T extends object, U>(store: Store<T>, selector: (state: T) => U): U;
export function useStore<T>(store: DerivedStore<T>): T;
export function useStore<T, U>(store: DerivedStore<T>, selector: (state: T) => U): U;
