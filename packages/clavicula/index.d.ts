// ─────────────────────────────────────────────────────────────
// Subscribable
// ─────────────────────────────────────────────────────────────

/** Base interface for any subscribable value source */
export interface Subscribable<T> {
  /** Returns current value */
  get(): T;

  /** Subscribes to value changes. Returns unsubscribe function. */
  subscribe(listener: (value: T) => void): () => void;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export interface Store<T extends object> extends Subscribable<T> {
  /** Updates state with partial object or updater function */
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
}

/** Creates a reactive store backed by EventTarget */
export function createStore<T extends object>(initialState: T): Store<T>;

// ─────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────

export interface DerivedStore<T> extends Subscribable<T> {
  /** Cleans up all subscriptions to source stores */
  destroy(): void;
}

/** Creates a read-only store computed from one source store */
export function derived<S, T>(
  store: Subscribable<S>,
  fn: (state: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;

/** Creates a read-only store computed from multiple source stores */
export function derived<S extends unknown[], T>(
  stores: { [K in keyof S]: Subscribable<S[K]> },
  fn: (...states: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;

// ─────────────────────────────────────────────────────────────
// Persist
// ─────────────────────────────────────────────────────────────

/** Syncs store state with localStorage under the given key */
export function withPersist<T extends object>(
  store: Store<T>,
  key: string
): Store<T>;

// ─────────────────────────────────────────────────────────────
// Batching
// ─────────────────────────────────────────────────────────────

/** Batches multiple synchronous set() calls into a single notification */
export function withBatching<T extends object>(store: Store<T>): Store<T>;
