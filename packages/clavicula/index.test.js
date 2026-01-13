import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore, derived, withPersist, withBatching } from './index.js';

// ─────────────────────────────────────────────────────────────
// createStore
// ─────────────────────────────────────────────────────────────

describe('createStore', () => {
  it('returns initial state via get()', () => {
    const store = createStore({ x: 1 });
    expect(store.get().x).toBe(1);
  });

  it('updates state with partial object', () => {
    const store = createStore({ x: 1, y: 2 });
    store.set({ x: 10 });
    expect(store.get()).toEqual({ x: 10, y: 2 });
  });

  it('updates state with functional update', () => {
    const store = createStore({ count: 0 });
    store.set(s => ({ count: s.count + 1 }));
    expect(store.get().count).toBe(1);
  });

  it('calls subscriber immediately with current state', () => {
    const store = createStore({ x: 1 });
    const listener = vi.fn();
    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ x: 1 });
  });

  it('notifies subscribers on set()', () => {
    const store = createStore({ x: 1 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ x: 2 });

    expect(listener).toHaveBeenCalledTimes(2); // initial + set
    expect(listener).toHaveBeenLastCalledWith({ x: 2 });
  });

  it('returns unsubscribe function from subscribe()', () => {
    const store = createStore({ x: 1 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set({ x: 2 });
    expect(listener).toHaveBeenCalledTimes(2); // initial + set

    unsubscribe();
    store.set({ x: 3 });
    expect(listener).toHaveBeenCalledTimes(2); // Still 2, not called again
  });

  it('supports multiple subscribers', () => {
    const store = createStore({ x: 1 });
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);

    store.set({ x: 2 });

    expect(listener1).toHaveBeenCalledTimes(2); // initial + set
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it('unsubscribing one listener does not affect others', () => {
    const store = createStore({ x: 1 });
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = store.subscribe(listener1);
    store.subscribe(listener2);

    unsub1();
    store.set({ x: 2 });

    expect(listener1).toHaveBeenCalledTimes(1); // Only initial call
    expect(listener2).toHaveBeenCalledTimes(2); // initial + set
  });
});

// ─────────────────────────────────────────────────────────────
// derived
// ─────────────────────────────────────────────────────────────

describe('derived', () => {
  describe('single dependency', () => {
    it('computes initial value from source store', () => {
      const base = createStore({ a: 1, b: 2 });
      const sum = derived(base, s => s.a + s.b);
      expect(sum.get()).toBe(3);
    });

    it('updates when source store changes', () => {
      const base = createStore({ a: 1, b: 2 });
      const sum = derived(base, s => s.a + s.b);

      base.set({ a: 10 });
      expect(sum.get()).toBe(12);
    });

    it('calls subscriber immediately with current derived value', () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      doubled.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(2);
    });

    it('notifies subscribers when derived value changes', () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      doubled.subscribe(listener);
      base.set({ x: 5 });

      expect(listener).toHaveBeenCalledTimes(2); // initial + change
      expect(listener).toHaveBeenLastCalledWith(10);
    });

    it('does not notify when derived value is unchanged (Object.is check)', () => {
      const base = createStore({ x: 1, y: 2 });
      const xOnly = derived(base, s => s.x);
      const listener = vi.fn();

      xOnly.subscribe(listener);

      // Change y but not x
      base.set({ y: 100 });

      expect(listener).toHaveBeenCalledTimes(1); // Only initial call
      expect(xOnly.get()).toBe(1);
    });

    it('supports unsubscribe from derived store', () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      const unsub = doubled.subscribe(listener);
      base.set({ x: 2 });
      expect(listener).toHaveBeenCalledTimes(2); // initial + change

      unsub();
      base.set({ x: 3 });
      expect(listener).toHaveBeenCalledTimes(2); // Still 2
    });
  });

  describe('multiple dependencies', () => {
    it('computes initial value from multiple stores', () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);

      expect(combined.get()).toBe(3);
    });

    it('updates when any source store changes', () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);

      store1.set({ a: 10 });
      expect(combined.get()).toBe(12);

      store2.set({ b: 20 });
      expect(combined.get()).toBe(30);
    });

    it('notifies subscribers when any dependency changes value', () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);
      const listener = vi.fn();

      combined.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // initial

      store1.set({ a: 5 });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(7);

      store2.set({ b: 10 });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenLastCalledWith(15);
    });
  });

  describe('destroy()', () => {
    it('cleans up subscriptions to source stores', () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      doubled.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // initial

      doubled.destroy();

      base.set({ x: 100 });

      // After destroy, updates should not propagate
      expect(listener).toHaveBeenCalledTimes(1); // Still just initial
      // The derived store still returns its last computed value
      expect(doubled.get()).toBe(2);
    });

    it('clears all derived store listeners', () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      doubled.subscribe(listener1);
      doubled.subscribe(listener2);

      // Both got initial call
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      doubled.destroy();

      base.set({ x: 100 });

      // After destroy, no more calls
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// withPersist
// ─────────────────────────────────────────────────────────────

describe('withPersist', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => mockStorage[key] ?? null),
      setItem: vi.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: vi.fn(key => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads initial state from localStorage if present', () => {
    mockStorage['test-key'] = JSON.stringify({ x: 42 });

    const store = withPersist(createStore({ x: 0 }), 'test-key');

    expect(store.get().x).toBe(42);
  });

  it('uses initial state if localStorage is empty', () => {
    const store = withPersist(createStore({ x: 5 }), 'test-key');

    expect(store.get().x).toBe(5);
  });

  it('saves state to localStorage on changes', () => {
    const store = withPersist(createStore({ x: 1 }), 'test-key');

    store.set({ x: 100 });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ x: 100 })
    );
  });

  it('returns the same store instance for chaining', () => {
    const original = createStore({ x: 1 });
    const persisted = withPersist(original, 'test-key');

    expect(persisted).toBe(original);
  });

  it('handles corrupt localStorage data gracefully', () => {
    mockStorage['corrupt-key'] = 'not valid json {{{';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const store = withPersist(createStore({ x: 99 }), 'corrupt-key');

    // Should keep initial state and warn
    expect(store.get().x).toBe(99);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('persists merged state correctly with partial updates', () => {
    const store = withPersist(
      createStore({ a: 1, b: 2 }),
      'merge-key'
    );

    store.set({ a: 10 });

    const saved = JSON.parse(mockStorage['merge-key']);
    expect(saved).toEqual({ a: 10, b: 2 });
  });
});

// ─────────────────────────────────────────────────────────────
// withBatching
// ─────────────────────────────────────────────────────────────

describe('withBatching', () => {
  it('single set works normally', async () => {
    const store = withBatching(createStore({ x: 0 }));
    const listener = vi.fn();
    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1); // initial

    store.set({ x: 1 });

    await Promise.resolve(); // flush microtask

    expect(listener).toHaveBeenCalledTimes(2); // initial + batched
    expect(listener).toHaveBeenLastCalledWith({ x: 1 });
  });

  it('batches multiple synchronous sets into single notification', async () => {
    const store = withBatching(createStore({ x: 0, y: 0 }));
    const listener = vi.fn();
    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1); // initial

    store.set({ x: 1 });
    store.set({ y: 2 });
    store.set({ x: 10 });

    expect(listener).toHaveBeenCalledTimes(1); // Still just initial, not flushed yet

    await Promise.resolve(); // flush microtask

    expect(listener).toHaveBeenCalledTimes(2); // initial + one batched update
    expect(listener).toHaveBeenLastCalledWith({ x: 10, y: 2 });
  });

  it('function partials see accumulated state', async () => {
    const store = withBatching(createStore({ count: 0 }));
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(s => ({ count: s.count + 1 }));
    store.set(s => ({ count: s.count + 1 }));
    store.set(s => ({ count: s.count + 1 }));

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(2); // initial + batched
    expect(listener).toHaveBeenLastCalledWith({ count: 3 });
  });

  it('get() returns pending changes during batch', () => {
    const store = withBatching(createStore({ x: 0, y: 0 }));

    store.set({ x: 5 });

    // Before flush, get() should see the pending value
    expect(store.get()).toEqual({ x: 5, y: 0 });
  });

  it('composes with other decorators', async () => {
    const base = createStore({ x: 1 });
    const batched = withBatching(base);
    const listener = vi.fn();

    batched.subscribe(listener);
    batched.set({ x: 10 });
    batched.set({ x: 20 });

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(2); // initial + batched
    expect(base.get()).toEqual({ x: 20 }); // underlying store updated
  });

  it('separate batches for separate microtasks', async () => {
    const store = withBatching(createStore({ x: 0 }));
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ x: 1 });
    await Promise.resolve(); // first batch

    store.set({ x: 2 });
    await Promise.resolve(); // second batch

    expect(listener).toHaveBeenCalledTimes(3); // initial + 2 batches
  });
});
