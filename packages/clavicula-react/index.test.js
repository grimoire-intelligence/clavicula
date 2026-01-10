import { describe, it, expect, vi } from 'vitest';
import { createStore, derived } from '../clavicula/index.js';

// Mock React's useSyncExternalStore
vi.mock('react', () => ({
  useSyncExternalStore: (subscribe, getSnapshot) => {
    // Simulate initial subscription
    const unsubscribe = subscribe(() => {});
    unsubscribe();
    return getSnapshot();
  }
}));

import { useStore } from './index.js';

describe('useStore (React)', () => {
  it('returns current store state', () => {
    const store = createStore({ count: 42 });
    const state = useStore(store);
    expect(state).toEqual({ count: 42 });
  });

  it('returns updated state after store changes', () => {
    const store = createStore({ count: 0 });

    // Initial state
    expect(useStore(store)).toEqual({ count: 0 });

    // Update store
    store.set({ count: 10 });

    // Hook returns new state
    expect(useStore(store)).toEqual({ count: 10 });
  });

  it('works with derived stores', () => {
    const store = createStore({ x: 2 });
    const doubled = derived(store, s => s.x * 2);

    expect(useStore(doubled)).toBe(4);

    store.set({ x: 5 });
    expect(useStore(doubled)).toBe(10);

    doubled.destroy();
  });

  it('passes subscribe and getSnapshot to useSyncExternalStore', async () => {
    const { useSyncExternalStore } = await import('react');
    const spy = vi.spyOn({ useSyncExternalStore }, 'useSyncExternalStore');

    const store = createStore({ value: 'test' });

    // The hook should call useSyncExternalStore with store.subscribe and store.get
    const result = useStore(store);
    expect(result.value).toBe('test');
  });
});
