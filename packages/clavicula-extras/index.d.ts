import type { Store, Subscribable, DerivedStore } from '@grimoire/clavicula';

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

/** Batches multiple synchronous set() calls into a single notification */
export function withBatching<T extends object>(store: Store<T>): Store<T>;

// ─────────────────────────────────────────────────────────────
// withDistinct
// ─────────────────────────────────────────────────────────────

/** Blocks set() calls when new state equals current state (shallow by default) */
export function withDistinct<T extends object>(
  store: Store<T>,
  isEqual?: (a: T, b: T) => boolean
): Store<T>;

// ─────────────────────────────────────────────────────────────
// withFreeze
// ─────────────────────────────────────────────────────────────

/** Freezes state objects to catch accidental mutations */
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

// ─────────────────────────────────────────────────────────────
// batchedDerived
// ─────────────────────────────────────────────────────────────

/** Like derived(), but batches synchronous dependency updates into a single recomputation */
export function batchedDerived<S, T>(
  store: Subscribable<S>,
  fn: (state: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;

/** Like derived(), but batches synchronous dependency updates into a single recomputation */
export function batchedDerived<S extends unknown[], T>(
  stores: { [K in keyof S]: Subscribable<S[K]> },
  fn: (...states: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;
