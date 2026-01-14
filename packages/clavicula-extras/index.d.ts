import type { Store } from '@grimoire/clavicula';

// ─────────────────────────────────────────────────────────────
// withPersist
// ─────────────────────────────────────────────────────────────

/** Syncs store state with localStorage under the given key */
export function withPersist<T extends object>(
  store: Store<T>,
  key: string
): Store<T>;

// ─────────────────────────────────────────────────────────────
// withBatching
// ─────────────────────────────────────────────────────────────

/** Batches multiple synchronous set() calls into a single notification.
 *  Also filters out no-op updates via equality checking (like derived() does).
 *  Pass `() => false` as isEqual to disable filtering. */
export function withBatching<T extends object>(
  store: Store<T>,
  isEqual?: (a: T, b: T) => boolean
): Store<T>;

// ─────────────────────────────────────────────────────────────
// withFreeze
// ─────────────────────────────────────────────────────────────

/** In dev: freezes state to catch mutations. In prod: no-op. */
export function withFreeze<T extends object>(store: Store<T>): Store<T>;

// ─────────────────────────────────────────────────────────────
// withReset
// ─────────────────────────────────────────────────────────────

export interface ResettableStore<T extends object> extends Store<T> {
  /** Restores the store to its initial state */
  reset(): void;
}

/** Adds a reset() method to restore initial state */
export function withReset<T extends object>(store: Store<T>): ResettableStore<T>;

// ─────────────────────────────────────────────────────────────
// withLogging
// ─────────────────────────────────────────────────────────────

/** Logs state changes to console */
export function withLogging<T extends object>(
  store: Store<T>,
  label?: string
): Store<T>;

// ─────────────────────────────────────────────────────────────
// withHistory
// ─────────────────────────────────────────────────────────────

export interface HistoryStore<T extends object> extends Store<T> {
  /** Reverts to previous state */
  undo(): void;
  /** Re-applies a reverted state */
  redo(): void;
  /** Returns true if undo is available */
  canUndo(): boolean;
  /** Returns true if redo is available */
  canRedo(): boolean;
}

/** Adds undo/redo capability to a store */
export function withHistory<T extends object>(
  store: Store<T>,
  maxSize?: number
): HistoryStore<T>;

