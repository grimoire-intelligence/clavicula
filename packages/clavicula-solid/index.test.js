import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, derived } from '../clavicula/index.js';

// Track cleanup functions
let cleanupFns = [];

// Mock Solid's reactivity primitives
vi.mock('solid-js', () => ({
  createSignal: (initial) => {
    let value = initial;
    const getter = () => value;
    const setter = (v) => { value = typeof v === 'function' ? v(value) : v; };
    return [getter, setter];
  },
  onCleanup: (fn) => {
    cleanupFns.push(fn);
  }
}));

import { useStore } from './index.js';

describe('useStore (Solid)', () => {
  beforeEach(() => {
    cleanupFns = [];
  });

  it('returns an accessor with initial store state', () => {
    const store = createStore({ count: 42 });
    const state = useStore(store);
    expect(state()).toEqual({ count: 42 });
  });

  it('accessor returns updated state after store changes', () => {
    const store = createStore({ count: 0 });
    const state = useStore(store);

    expect(state()).toEqual({ count: 0 });

    store.set({ count: 77 });

    expect(state()).toEqual({ count: 77 });
  });

  it('registers cleanup with onCleanup', () => {
    const store = createStore({ x: 1 });
    useStore(store);

    expect(cleanupFns.length).toBe(1);
    expect(typeof cleanupFns[0]).toBe('function');
  });

  it('unsubscribes when cleanup is called', () => {
    const store = createStore({ x: 1 });
    const state = useStore(store);

    store.set({ x: 2 });
    expect(state()).toEqual({ x: 2 });

    // Simulate component cleanup
    cleanupFns[0]();

    // Store updates but signal won't be updated
    const lastValue = state();
    store.set({ x: 999 });
    // After unsubscribe, accessor still returns last value before cleanup
    expect(state()).toEqual(lastValue);
  });

  it('works with derived stores', () => {
    const store = createStore({ name: 'Alice' });
    const upperName = derived(store, s => s.name.toUpperCase());

    const state = useStore(upperName);
    expect(state()).toBe('ALICE');

    store.set({ name: 'Bob' });
    expect(state()).toBe('BOB');

    upperName.destroy();
  });

  it('handles multiple subscriptions correctly', () => {
    const store = createStore({ a: 1, b: 2 });
    const state1 = useStore(store);
    const state2 = useStore(store);

    expect(state1()).toEqual({ a: 1, b: 2 });
    expect(state2()).toEqual({ a: 1, b: 2 });

    store.set({ a: 10 });

    expect(state1()).toEqual({ a: 10, b: 2 });
    expect(state2()).toEqual({ a: 10, b: 2 });
  });
});
