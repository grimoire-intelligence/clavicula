// ─────────────────────────────────────────────────────────────
// withPersist
// ─────────────────────────────────────────────────────────────

/**
 * Decorator that syncs a store with localStorage.
 *
 * WARNING: Writes to localStorage on EVERY state change. For stores with frequent
 * updates or large state, first wrap with withBatching and withDistinct:
 *   withPersist(withBatching(withDistinct(createStore(...))), 'key')
 * This ensures persistence only triggers on batched, distinct changes.
 *
 * @param {import('@grimoire/clavicula').Store} store - The store to persist
 * @param {string} key - localStorage key
 * @returns {import('@grimoire/clavicula').Store} The same store (mutated to add persistence)
 */
export function withPersist(store, key) {
  if (typeof localStorage === 'undefined') return store;

  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      store.set(JSON.parse(saved));
    } catch (e) {
      console.warn(`Failed to parse persisted state for "${key}"`, e);
    }
  }

  store.subscribe(state => {
    localStorage.setItem(key, JSON.stringify(state));
  });

  return store;
}

// ─────────────────────────────────────────────────────────────
// withBatching
// ─────────────────────────────────────────────────────────────

/**
 * Decorator that batches multiple synchronous set() calls into a single notification.
 * Useful for vanilla JS and Svelte; React/Vue/Solid handle their own batching.
 * @param {import('@grimoire/clavicula').Store} store - The store to wrap
 * @returns {import('@grimoire/clavicula').Store} A new store with batched updates
 */
export function withBatching(store) {
  let batching = false;
  let queued = {};

  return {
    get: () => store.get(),

    subscribe: store.subscribe,

    set(partial) {
      const current = { ...store.get(), ...queued };
      const update = typeof partial === 'function' ? partial(current) : partial;
      queued = { ...queued, ...update };
      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          const final = { ...store.get(), ...queued };
          store.set(final);
          queued = {};
          batching = false;
        });
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// withDistinct
// ─────────────────────────────────────────────────────────────

/**
 * Shallow equality check for objects.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => Object.is(a[k], b[k]));
}

/**
 * Decorator that blocks set() calls when new state shallow-equals current state.
 * Reduces event spam from redundant updates.
 * @param {import('@grimoire/clavicula').Store} store - The store to wrap
 * @param {function} [isEqual=shallowEqual] - Custom equality function
 * @returns {import('@grimoire/clavicula').Store} A new store with distinct updates only
 */
export function withDistinct(store, isEqual = shallowEqual) {
  return {
    get: store.get,
    subscribe: store.subscribe,
    set(partial) {
      const current = store.get();
      const next = typeof partial === 'function'
        ? { ...current, ...partial(current) }
        : { ...current, ...partial };
      if (!isEqual(current, next)) {
        store.set(next);
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// withFreeze
// ─────────────────────────────────────────────────────────────

/**
 * In development: deeply freezes state after every set() to catch mutations.
 * In production: identity function (no-op).
 * @param {import('@grimoire/clavicula').Store} store - The store to wrap
 * @returns {import('@grimoire/clavicula').Store} A new store that freezes state (dev only)
 */
export function withFreeze(store) {
  if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') {
    return store;
  }

  const freeze = (obj) => {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      Object.values(obj).forEach(freeze);
    }
  };

  freeze(store.get());

  return {
    get: store.get,
    subscribe: store.subscribe,
    set(partial) {
      store.set(partial);
      freeze(store.get());
    }
  };
}

// ─────────────────────────────────────────────────────────────
// withReset
// ─────────────────────────────────────────────────────────────

/**
 * Decorator that adds a reset() method to restore initial state.
 * @param {import('@grimoire/clavicula').Store} store - The store to wrap
 * @returns {import('@grimoire/clavicula').Store & { reset: () => void }} Store with reset method
 */
export function withReset(store) {
  const initial = { ...store.get() };

  return {
    get: store.get,
    subscribe: store.subscribe,
    set: store.set,
    reset: () => store.set(initial)
  };
}

// ─────────────────────────────────────────────────────────────
// withLogging
// ─────────────────────────────────────────────────────────────

/**
 * Decorator that logs state changes to console.
 * @param {import('@grimoire/clavicula').Store} store - The store to log
 * @param {string} [label='store'] - Label for log messages
 * @returns {import('@grimoire/clavicula').Store} The same store
 */
export function withLogging(store, label = 'store') {
  store.subscribe(state => {
    console.log(`[${label}]`, state);
  });
  return store;
}

// ─────────────────────────────────────────────────────────────
// withHistory
// ─────────────────────────────────────────────────────────────

/**
 * Decorator that adds undo/redo capability to a store.
 * @param {import('@grimoire/clavicula').Store} store - The store to wrap
 * @param {number} [maxSize=50] - Maximum history size
 * @returns {import('@grimoire/clavicula').Store & { undo: () => void, redo: () => void, canUndo: () => boolean, canRedo: () => boolean }}
 */
export function withHistory(store, maxSize = 50) {
  let past = [];
  let future = [];
  let skipNext = false;

  // Track changes (skip when triggered by undo/redo)
  store.subscribe(state => {
    if (skipNext) {
      skipNext = false;
      return;
    }
    // Clear future on new changes
    future = [];
  });

  return {
    get: store.get,
    subscribe: store.subscribe,

    set(partial) {
      // Save current state to history before change
      past.push(store.get());
      if (past.length > maxSize) {
        past.shift();
      }
      future = [];
      store.set(partial);
    },

    undo() {
      if (past.length === 0) return;
      future.push(store.get());
      skipNext = true;
      store.set(past.pop());
    },

    redo() {
      if (future.length === 0) return;
      past.push(store.get());
      skipNext = true;
      store.set(future.pop());
    },

    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}

