// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export interface Store<T extends object> {
  /** Returns current state */
  get(): T;

  /** Updates state with partial object or updater function */
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;

  /** Subscribes to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: T) => void): () => void;
}

/** Creates a reactive store backed by EventTarget */
export function createStore<T extends object>(initialState: T): Store<T>;

// ─────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────

export interface DerivedStore<T> {
  /** Returns current derived value */
  get(): T;

  /** Subscribes to derived value changes. Returns unsubscribe function. */
  subscribe(listener: (value: T) => void): () => void;

  /** Cleans up all subscriptions to source stores */
  destroy(): void;
}

/** Creates a read-only store computed from one source store */
export function derived<S extends object, T>(
  store: Store<S>,
  fn: (state: S) => T
): DerivedStore<T>;

/** Creates a read-only store computed from multiple source stores */
export function derived<S extends object[], T>(
  stores: { [K in keyof S]: Store<S[K]> },
  fn: (...states: S) => T
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
