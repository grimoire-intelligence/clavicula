/**
 * Creates a reactive store backed by EventTarget.
 * @param {object} initial - Initial state. Must be a plain object.
 * @returns {Store} Store with get(), set(), subscribe() methods
 */
export function createStore(initial) {
  let state = initial;
  const bus = new EventTarget();

  return {
    get: () => state,

    set(partial) {
      state = typeof partial === 'function'
        ? { ...state, ...partial(state) }
        : { ...state, ...partial };
      bus.dispatchEvent(new CustomEvent('change', { detail: state }));
    },

    subscribe(fn) {
      const handler = (e) => fn(e.detail);
      bus.addEventListener('change', handler);
      fn(state);
      return () => bus.removeEventListener('change', handler);
    }
  };
}

/**
 * Creates a read-only store whose value is computed from one or more source stores.
 * @param {Store|Store[]} stores - One or more source stores
 * @param {Function} fn - Derivation function receiving current values of all source stores
 * @returns {DerivedStore} DerivedStore with get(), subscribe(), destroy() methods
 */
export function derived(stores, fn) {
  const deps = Array.isArray(stores) ? stores : [stores];
  const listeners = new Set();
  const unsubs = [];

  let value = fn(...deps.map(s => s.get()));

  deps.forEach(store => {
    const unsub = store.subscribe(() => {
      const next = fn(...deps.map(s => s.get()));
      if (!Object.is(value, next)) {
        value = next;
        listeners.forEach(l => l(value));
      }
    });
    unsubs.push(unsub);
  });

  return {
    get: () => value,

    subscribe(fn) {
      listeners.add(fn);
      fn(value);
      return () => listeners.delete(fn);
    },

    destroy() {
      unsubs.forEach(fn => fn());
      listeners.clear();
    }
  };
}

/**
 * Decorator that syncs a store with localStorage.
 * @param {Store} store - The store to persist
 * @param {string} key - localStorage key
 * @returns {Store} The same store (mutated to add persistence)
 */
export function withPersist(store, key) {
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

/**
 * Decorator that batches multiple synchronous set() calls into a single notification.
 * Useful for vanilla JS and Svelte; React/Vue/Solid handle their own batching.
 * @param {Store} store - The store to wrap
 * @returns {Store} A new store with batched updates
 */
export function withBatching(store) {
  let batching = false;
  let queued = {};

  return {
    get: () => ({ ...store.get(), ...queued }),

    subscribe: store.subscribe,

    set(partial) {
      const current = { ...store.get(), ...queued };
      const update = typeof partial === 'function' ? partial(current) : partial;
      queued = { ...queued, ...update };
      if (!batching) {
        batching = true;
        queueMicrotask(() => {
          store.set(queued);
          queued = {};
          batching = false;
        });
      }
    }
  };
}
