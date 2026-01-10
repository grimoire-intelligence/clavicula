import { describe, it, expect, vi } from 'vitest';
import { createStore, derived } from '../clavicula/index.js';

// Mock RxJS Observable
vi.mock('rxjs', () => ({
  Observable: class Observable {
    constructor(subscribe) {
      this._subscribe = subscribe;
    }
    subscribe(observer) {
      const next = typeof observer === 'function' ? observer : observer.next?.bind(observer);
      return this._subscribe({ next });
    }
  }
}));

// Mock Angular's signal
vi.mock('@angular/core', () => ({
  signal: (initial) => {
    let value = initial;
    const callable = () => value;
    callable.set = (v) => { value = v; };
    callable.asReadonly = () => () => value;
    return callable;
  }
}));

import { toObservable, toSignal } from './index.js';

describe('toObservable (Angular)', () => {
  it('emits initial value immediately', () => {
    const store = createStore({ count: 42 });
    const obs = toObservable(store);

    const values = [];
    obs.subscribe(v => values.push(v));

    expect(values).toEqual([{ count: 42 }]);
  });

  it('emits on store changes', () => {
    const store = createStore({ count: 0 });
    const obs = toObservable(store);

    const values = [];
    obs.subscribe(v => values.push(v));

    store.set({ count: 1 });
    store.set({ count: 2 });

    expect(values).toEqual([
      { count: 0 },
      { count: 1 },
      { count: 2 }
    ]);
  });

  it('returns unsubscribe function from observable', () => {
    const store = createStore({ x: 1 });
    const obs = toObservable(store);

    const values = [];
    const sub = obs.subscribe(v => values.push(v));

    store.set({ x: 2 });
    sub(); // Unsubscribe (our mock returns the unsub function directly)
    store.set({ x: 3 });

    expect(values).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it('works with derived stores', () => {
    const store = createStore({ items: ['a', 'b'] });
    const count = derived(store, s => s.items.length);

    const obs = toObservable(count);
    const values = [];
    obs.subscribe(v => values.push(v));

    store.set({ items: ['a', 'b', 'c'] });

    expect(values).toEqual([2, 3]);

    count.destroy();
  });
});

describe('toSignal (Angular)', () => {
  it('returns signal with initial store value', () => {
    const store = createStore({ name: 'Alice' });
    const { signal } = toSignal(store);

    expect(signal()).toEqual({ name: 'Alice' });
  });

  it('signal updates when store changes', () => {
    const store = createStore({ name: 'Alice' });
    const { signal } = toSignal(store);

    expect(signal()).toEqual({ name: 'Alice' });

    store.set({ name: 'Bob' });

    expect(signal()).toEqual({ name: 'Bob' });
  });

  it('returns destroy function for cleanup', () => {
    const store = createStore({ x: 1 });
    const { signal, destroy } = toSignal(store);

    expect(typeof destroy).toBe('function');

    store.set({ x: 2 });
    expect(signal()).toEqual({ x: 2 });

    destroy();

    // After destroy, signal keeps last value
    const lastValue = signal();
    store.set({ x: 999 });
    expect(signal()).toEqual(lastValue);
  });

  it('works with derived stores', () => {
    const store = createStore({ price: 100 });
    const doubled = derived(store, s => s.price * 2);

    const { signal, destroy } = toSignal(doubled);

    expect(signal()).toBe(200);

    store.set({ price: 50 });
    expect(signal()).toBe(100);

    destroy();
    doubled.destroy();
  });

  it('multiple signals can subscribe to same store', () => {
    const store = createStore({ v: 1 });
    const result1 = toSignal(store);
    const result2 = toSignal(store);

    expect(result1.signal()).toEqual({ v: 1 });
    expect(result2.signal()).toEqual({ v: 1 });

    store.set({ v: 5 });

    expect(result1.signal()).toEqual({ v: 5 });
    expect(result2.signal()).toEqual({ v: 5 });

    result1.destroy();
    result2.destroy();
  });
});
