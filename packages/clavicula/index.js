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
 * @param {Function} [isEqual=Object.is] - Equality function to prevent spurious notifications
 * @returns {DerivedStore} DerivedStore with get(), subscribe(), destroy() methods
 */
export function derived(stores, fn, isEqual = Object.is) {
  const deps = Array.isArray(stores) ? stores : [stores];
  const listeners = new Set();
  const unsubs = [];
  let initializing = true;

  let value = fn(...deps.map(s => s.get()));

  deps.forEach(store => {
    const unsub = store.subscribe(() => {
      if (initializing) return;
      const next = fn(...deps.map(s => s.get()));
      if (!isEqual(value, next)) {
        value = next;
        listeners.forEach(l => l(value));
      }
    });
    unsubs.push(unsub);
  });

  initializing = false;

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

