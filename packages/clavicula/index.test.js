import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore, derived } from './index.js';

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

    it('updates when source store changes', async () => {
      const base = createStore({ a: 1, b: 2 });
      const sum = derived(base, s => s.a + s.b);

      base.set({ a: 10 });
      await Promise.resolve();
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

    it('notifies subscribers when derived value changes', async () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      doubled.subscribe(listener);
      base.set({ x: 5 });
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(2); // initial + change
      expect(listener).toHaveBeenLastCalledWith(10);
    });

    it('does not notify when derived value is unchanged (Object.is check)', async () => {
      const base = createStore({ x: 1, y: 2 });
      const xOnly = derived(base, s => s.x);
      const listener = vi.fn();

      xOnly.subscribe(listener);

      // Change y but not x
      base.set({ y: 100 });
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(1); // Only initial call
      expect(xOnly.get()).toBe(1);
    });

    it('supports unsubscribe from derived store', async () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      const unsub = doubled.subscribe(listener);
      base.set({ x: 2 });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(2); // initial + change

      unsub();
      base.set({ x: 3 });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(2); // Still 2
    });

    it('accepts custom equality function for arrays', async () => {
      const base = createStore({ items: ['a', 'b'] });
      const shallowArrayEqual = (a, b) =>
        Array.isArray(a) && Array.isArray(b) &&
        a.length === b.length &&
        a.every((v, i) => v === b[i]);

      const filtered = derived(
        base,
        s => s.items.filter(i => i !== 'x'),
        shallowArrayEqual
      );
      const listener = vi.fn();

      filtered.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // initial

      // This creates a new array reference but same contents
      base.set({ items: ['a', 'b'] });
      await Promise.resolve();

      // With shallowArrayEqual, no notification (contents identical)
      expect(listener).toHaveBeenCalledTimes(1);

      // Actually change contents
      base.set({ items: ['a', 'b', 'c'] });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(2);

      filtered.destroy();
    });
  });

  describe('multiple dependencies', () => {
    it('computes initial value from multiple stores', () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);

      expect(combined.get()).toBe(3);
    });

    it('updates when any source store changes', async () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);

      store1.set({ a: 10 });
      await Promise.resolve();
      expect(combined.get()).toBe(12);

      store2.set({ b: 20 });
      await Promise.resolve();
      expect(combined.get()).toBe(30);
    });

    it('notifies subscribers when any dependency changes value', async () => {
      const store1 = createStore({ a: 1 });
      const store2 = createStore({ b: 2 });
      const combined = derived([store1, store2], (s1, s2) => s1.a + s2.b);
      const listener = vi.fn();

      combined.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // initial

      store1.set({ a: 5 });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(7);

      store2.set({ b: 10 });
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenLastCalledWith(15);
    });

    it('batches multiple synchronous updates into single recomputation', async () => {
      const store1 = createStore({ a: 0 });
      const store2 = createStore({ b: 0 });
      const fn = vi.fn((s1, s2) => s1.a + s2.b);
      const combined = derived([store1, store2], fn);

      expect(fn).toHaveBeenCalledTimes(1); // initial

      store1.set({ a: 1 });
      store2.set({ b: 2 });
      store1.set({ a: 10 });

      expect(fn).toHaveBeenCalledTimes(1); // still just initial, batched

      await Promise.resolve();

      expect(fn).toHaveBeenCalledTimes(2); // initial + one batched recompute
      expect(combined.get()).toBe(12);
    });
  });

  describe('destroy()', () => {
    it('cleans up subscriptions to source stores', async () => {
      const base = createStore({ x: 1 });
      const doubled = derived(base, s => s.x * 2);
      const listener = vi.fn();

      doubled.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1); // initial

      doubled.destroy();

      base.set({ x: 100 });
      await Promise.resolve();

      // After destroy, updates should not propagate
      expect(listener).toHaveBeenCalledTimes(1); // Still just initial
      // The derived store still returns its last computed value
      expect(doubled.get()).toBe(2);
    });

    it('clears all derived store listeners', async () => {
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
      await Promise.resolve();

      // After destroy, no more calls
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});

