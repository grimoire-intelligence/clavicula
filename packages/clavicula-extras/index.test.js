import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from '@grimoire/clavicula';
import {
  withPersist,
  withBatching,
  withDistinct,
  withFreeze,
  withReset,
  withLogging,
  withHistory,
  batchedDerived
} from './index.js';

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

// ─────────────────────────────────────────────────────────────
// withDistinct
// ─────────────────────────────────────────────────────────────

describe('withDistinct', () => {
  it('allows updates when values differ', () => {
    const store = withDistinct(createStore({ x: 1, y: 2 }));
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ x: 10 });

    expect(listener).toHaveBeenCalledTimes(2); // initial + update
    expect(store.get()).toEqual({ x: 10, y: 2 });
  });

  it('blocks updates when values are shallowly equal', () => {
    const base = createStore({ x: 1, y: 2 });
    const store = withDistinct(base);
    const listener = vi.fn();
    base.subscribe(listener);

    store.set({ x: 1 }); // same value

    expect(listener).toHaveBeenCalledTimes(1); // only initial
  });

  it('detects changes in number of keys', () => {
    const base = createStore({ x: 1 });
    const store = withDistinct(base);
    const listener = vi.fn();
    base.subscribe(listener);

    store.set({ x: 1, y: 2 }); // adding key

    expect(listener).toHaveBeenCalledTimes(2); // initial + update
  });

  it('supports function partials', () => {
    const store = withDistinct(createStore({ count: 5 }));

    store.set(s => ({ count: s.count })); // no change

    expect(store.get().count).toBe(5);
  });

  it('supports custom equality function', () => {
    const base = createStore({ items: [1, 2, 3] });
    const arrayEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const store = withDistinct(base, arrayEqual);
    const listener = vi.fn();
    base.subscribe(listener);

    store.set({ items: [1, 2, 3] }); // same array contents

    expect(listener).toHaveBeenCalledTimes(1); // only initial, blocked
  });
});

// ─────────────────────────────────────────────────────────────
// withFreeze
// ─────────────────────────────────────────────────────────────

describe('withFreeze', () => {
  it('freezes initial state', () => {
    const store = withFreeze(createStore({ x: 1 }));

    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('freezes state after set', () => {
    const store = withFreeze(createStore({ x: 1 }));

    store.set({ x: 2 });

    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('deep freezes nested objects', () => {
    const store = withFreeze(createStore({ nested: { a: 1 } }));

    expect(Object.isFrozen(store.get().nested)).toBe(true);
  });

  it('throws on mutation attempt in strict mode', () => {
    const store = withFreeze(createStore({ x: 1 }));

    expect(() => {
      'use strict';
      store.get().x = 99;
    }).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// withReset
// ─────────────────────────────────────────────────────────────

describe('withReset', () => {
  it('provides reset method', () => {
    const store = withReset(createStore({ x: 1 }));

    expect(typeof store.reset).toBe('function');
  });

  it('resets to initial state', () => {
    const store = withReset(createStore({ x: 1, y: 2 }));

    store.set({ x: 100, y: 200 });
    store.reset();

    expect(store.get()).toEqual({ x: 1, y: 2 });
  });

  it('notifies subscribers on reset', () => {
    const store = withReset(createStore({ x: 1 }));
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ x: 99 });
    store.reset();

    expect(listener).toHaveBeenCalledTimes(3); // initial + set + reset
    expect(listener).toHaveBeenLastCalledWith({ x: 1 });
  });

  it('preserves other store methods', () => {
    const store = withReset(createStore({ x: 1 }));

    expect(typeof store.get).toBe('function');
    expect(typeof store.set).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────
// withLogging
// ─────────────────────────────────────────────────────────────

describe('withLogging', () => {
  it('logs initial state', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    withLogging(createStore({ x: 1 }));

    expect(logSpy).toHaveBeenCalledWith('[store]', { x: 1 });
    logSpy.mockRestore();
  });

  it('logs state changes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const store = withLogging(createStore({ x: 1 }));
    store.set({ x: 99 });

    expect(logSpy).toHaveBeenLastCalledWith('[store]', { x: 99 });
    logSpy.mockRestore();
  });

  it('uses custom label', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    withLogging(createStore({ x: 1 }), 'myStore');

    expect(logSpy).toHaveBeenCalledWith('[myStore]', { x: 1 });
    logSpy.mockRestore();
  });

  it('returns the same store instance', () => {
    const original = createStore({ x: 1 });
    const logged = withLogging(original);

    expect(logged).toBe(original);
  });
});

// ─────────────────────────────────────────────────────────────
// withHistory
// ─────────────────────────────────────────────────────────────

describe('withHistory', () => {
  it('provides undo/redo methods', () => {
    const store = withHistory(createStore({ x: 1 }));

    expect(typeof store.undo).toBe('function');
    expect(typeof store.redo).toBe('function');
    expect(typeof store.canUndo).toBe('function');
    expect(typeof store.canRedo).toBe('function');
  });

  it('canUndo is false initially', () => {
    const store = withHistory(createStore({ x: 1 }));

    expect(store.canUndo()).toBe(false);
  });

  it('canUndo is true after set', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.set({ x: 2 });

    expect(store.canUndo()).toBe(true);
  });

  it('undo restores previous state', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.set({ x: 2 });
    store.set({ x: 3 });
    store.undo();

    expect(store.get().x).toBe(2);
  });

  it('redo restores undone state', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.set({ x: 2 });
    store.undo();
    store.redo();

    expect(store.get().x).toBe(2);
  });

  it('canRedo is true after undo', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.set({ x: 2 });
    store.undo();

    expect(store.canRedo()).toBe(true);
  });

  it('new set clears redo stack', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.set({ x: 2 });
    store.undo();
    store.set({ x: 3 }); // new change

    expect(store.canRedo()).toBe(false);
  });

  it('respects maxSize limit', () => {
    const store = withHistory(createStore({ x: 0 }), 3);

    store.set({ x: 1 });
    store.set({ x: 2 });
    store.set({ x: 3 });
    store.set({ x: 4 }); // exceeds limit

    // Should only be able to undo 3 times
    store.undo();
    store.undo();
    store.undo();

    expect(store.canUndo()).toBe(false);
    expect(store.get().x).toBe(1); // oldest retained state
  });

  it('undo with empty history is a no-op', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.undo(); // should not throw

    expect(store.get().x).toBe(1);
  });

  it('redo with empty future is a no-op', () => {
    const store = withHistory(createStore({ x: 1 }));

    store.redo(); // should not throw

    expect(store.get().x).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Composition
// ─────────────────────────────────────────────────────────────

describe('decorator composition', () => {
  it('withDistinct + withBatching', async () => {
    const base = createStore({ x: 0 });
    const store = withDistinct(withBatching(base));
    const listener = vi.fn();
    base.subscribe(listener);

    store.set({ x: 1 });
    store.set({ x: 1 }); // duplicate

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(2); // initial + batched (distinct blocks duplicate)
  });

  it('withFreeze + withHistory', () => {
    const store = withHistory(withFreeze(createStore({ x: 1 })));

    store.set({ x: 2 });
    store.undo();

    expect(store.get().x).toBe(1);
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('withReset + withLogging', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const store = withReset(withLogging(createStore({ x: 1 }), 'test'));

    store.set({ x: 99 });
    store.reset();

    expect(logSpy).toHaveBeenLastCalledWith('[test]', { x: 1 });
    logSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────
// batchedDerived
// ─────────────────────────────────────────────────────────────

describe('batchedDerived', () => {
  it('computes initial value', () => {
    const a = createStore({ x: 1 });
    const d = batchedDerived(a, s => s.x * 2);

    expect(d.get()).toBe(2);
  });

  it('updates when dependency changes', async () => {
    const a = createStore({ x: 1 });
    const d = batchedDerived(a, s => s.x * 2);

    a.set({ x: 5 });
    await Promise.resolve(); // flush microtask

    expect(d.get()).toBe(10);
  });

  it('batches multiple synchronous updates into single recomputation', async () => {
    const a = createStore({ x: 0 });
    const b = createStore({ y: 0 });
    const fn = vi.fn((aVal, bVal) => aVal.x + bVal.y);
    const d = batchedDerived([a, b], fn);

    expect(fn).toHaveBeenCalledTimes(1); // initial

    a.set({ x: 1 });
    b.set({ y: 2 });
    a.set({ x: 10 });

    expect(fn).toHaveBeenCalledTimes(1); // still just initial, batched

    await Promise.resolve(); // flush microtask

    expect(fn).toHaveBeenCalledTimes(2); // initial + one batched recompute
    expect(d.get()).toBe(12);
  });

  it('notifies subscribers after batch', async () => {
    const a = createStore({ x: 0 });
    const b = createStore({ y: 0 });
    const d = batchedDerived([a, b], (aVal, bVal) => aVal.x + bVal.y);
    const listener = vi.fn();
    d.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1); // initial

    a.set({ x: 5 });
    b.set({ y: 5 });

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(2); // initial + batched
    expect(listener).toHaveBeenLastCalledWith(10);
  });

  it('does not notify if value unchanged after batch', async () => {
    const a = createStore({ x: 1 });
    const b = createStore({ y: -1 });
    const d = batchedDerived([a, b], (aVal, bVal) => aVal.x + bVal.y);
    const listener = vi.fn();
    d.subscribe(listener);

    a.set({ x: 5 });
    b.set({ y: -5 }); // sum still 0

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1); // only initial, no change
  });

  it('supports custom equality function', async () => {
    const a = createStore({ items: [1, 2] });
    const arrayEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const d = batchedDerived(a, s => [...s.items], arrayEqual);
    const listener = vi.fn();
    d.subscribe(listener);

    a.set({ items: [1, 2] }); // same contents

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1); // blocked by equality
  });

  it('destroy() cleans up subscriptions', async () => {
    const a = createStore({ x: 1 });
    const fn = vi.fn(s => s.x);
    const d = batchedDerived(a, fn);

    d.destroy();
    a.set({ x: 99 });

    await Promise.resolve();

    expect(fn).toHaveBeenCalledTimes(1); // only initial, no recompute after destroy
  });
});
