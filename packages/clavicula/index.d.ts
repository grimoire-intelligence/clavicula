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
// Readable / Writable
// ─────────────────────────────────────────────────────────────

/** Read-only subscribable (marker interface for type narrowing) */
export interface Readable<T> extends Subscribable<T> {}

/** Writable subscribable with partial update support */
export interface Writable<T extends object> extends Subscribable<T> {
  /** Updates state with partial object or updater function */
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export type Store<T extends object> = Writable<T>;

/** Creates a reactive store backed by EventTarget */
export function createStore<T extends object>(initialState: T): Store<T>;

// ─────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────

export type DerivedStore<T> = Readable<T> & {
  /** Cleans up all subscriptions to source stores */
  destroy(): void;
};

/** Creates a read-only store computed from a single source */
export function derived<S, T>(
  source: Subscribable<S>,
  derive: (value: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;

/** Creates a read-only store computed from multiple sources */
export function derived<S extends any[], T>(
  sources: { [K in keyof S]: Subscribable<S[K]> },
  derive: (...values: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>;

// ─────────────────────────────────────────────────────────────
// Type Utilities
// ─────────────────────────────────────────────────────────────

/** Extracts state type from any store-like */
export type InferState<S> = S extends Subscribable<infer T> ? T : never;

/** Describes the shape of a store with multiple decorators applied */
export type DecoratedStore<
  T extends object,
  Decorators extends Array<(s: any) => any>
> = Decorators extends []
  ? Store<T>
  : Decorators extends [infer First, ...infer Rest extends Array<(s: any) => any>]
    ? First extends (s: any) => infer R
      ? R & DecoratedStore<InferState<R> & object, Rest>
      : never
    : never;

