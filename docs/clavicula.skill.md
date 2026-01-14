# Clavicula Agent Skill

This document provides a machine-readable API reference for AI assistants working with the Clavicula state management library.

## Skill Metadata

```yaml
name: clavicula
version: 0.1.0
packages:
  core: "@grimoire/clavicula"          # ~670 bytes
  extras: "@grimoire/clavicula-extras" # ~2KB, tree-shakeable
category: state-management
framework: agnostic
```

## Quick Reference

```
CORE:     import { createStore, derived } from '@grimoire/clavicula';
EXTRAS:   import { withPersist, withBatching, withHistory, ... } from '@grimoire/clavicula-extras';
STORE:    store.get() | store.set(partial) | store.subscribe(fn) => unsubscribe
DERIVED:  derivedStore.get() | derivedStore.subscribe(fn) | derivedStore.destroy()
```

---

## Philosophy

1. **EventTarget is enough** — No custom event systems. The browser's primitive is the foundation.
2. **Stores are values, not behaviors** — No methods on state. Actions live outside the store.
3. **Subscriptions are caller's responsibility** — The store doesn't track your lifecycle.
4. **Derived stores must be destroyed** — No magic cleanup. Explicit ownership.

---

## API Specification

### createStore

Creates a reactive store backed by EventTarget.

```typescript
function createStore<T extends object>(initialState: T): Store<T>
```

**Parameters:**
- `initialState` (object, required): Initial state. Must be a plain object.

**Returns:** Store instance with `get`, `set`, `subscribe` methods.

**Example:**
```javascript
const store = createStore({ count: 0, user: null });
```

---

### Store.get

Returns the current state.

```typescript
store.get(): T
```

**Parameters:** None

**Returns:** Current state object (same reference until next `set`)

**Example:**
```javascript
const state = store.get();
console.log(state.count);
```

---

### Store.set

Updates the state with a partial object or updater function.

```typescript
store.set(partial: Partial<T> | ((state: T) => Partial<T>)): void
```

**Parameters:**
- `partial` (object | function): Either a partial state object to merge, or a function receiving current state and returning partial state.

**Returns:** void

**Examples:**
```javascript
// Partial object
store.set({ count: 5 });

// Updater function
store.set(state => ({ count: state.count + 1 }));

// Multiple properties
store.set({ count: 0, user: { name: 'Alice' } });
```

**Behavior:**
- Merges partial into current state using spread: `{ ...state, ...partial }`
- Dispatches 'change' event to all subscribers
- Synchronous execution

---

### Store.subscribe

Subscribes to state changes.

```typescript
store.subscribe(listener: (state: T) => void): () => void
```

**Parameters:**
- `listener` (function): Callback receiving new state on each change.

**Returns:** Unsubscribe function (call to stop listening)

**Example:**
```javascript
const unsubscribe = store.subscribe(state => {
  console.log('New state:', state);
});

// Later: stop listening
unsubscribe();
```

**Behavior:**
- Listener called on every `set`, even if values unchanged
- Listener receives complete state, not diff
- Unsubscribe is idempotent (safe to call multiple times)

---

### derived

Creates a read-only store computed from one or more source stores.

```typescript
// Single store
function derived<S extends object, T>(
  store: Store<S>,
  fn: (state: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>

// Multiple stores
function derived<S extends object[], T>(
  stores: Store<S[number]>[],
  fn: (...states: S) => T,
  isEqual?: (a: T, b: T) => boolean
): DerivedStore<T>
```

**Parameters:**
- `stores` (Store | Store[]): One or more source stores
- `fn` (function): Derivation function. Receives current values, returns derived value.
- `isEqual` (function, optional): Equality function. Defaults to `Object.is`.

**Returns:** DerivedStore with `get`, `subscribe`, `destroy` methods

**Examples:**
```javascript
// Single dependency
const itemCount = derived(cartStore, state => state.items.length);

// Multiple dependencies
const total = derived(
  [cartStore, taxStore],
  (cart, tax) => cart.subtotal * (1 + tax.rate)
);

// Custom equality for filtered arrays
const shallowArrayEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const activeItems = derived(
  store,
  s => s.items.filter(i => i.active),
  shallowArrayEqual
);
```

**Behavior:**
- Batches multiple synchronous source updates into a single recomputation
- Uses `isEqual` (default: `Object.is`) to skip spurious notifications
- Notifies only when derived value changes
- Must call `destroy()` when no longer needed

**Note:** Filtered arrays always create new references, so `Object.is` returns false even when contents match. Pass a shallow equality function for array-returning derivations.

---

### DerivedStore.get

Returns the current derived value.

```typescript
derivedStore.get(): T
```

**Parameters:** None

**Returns:** Current computed value

---

### DerivedStore.subscribe

Subscribes to derived value changes.

```typescript
derivedStore.subscribe(listener: (value: T) => void): () => void
```

**Parameters:**
- `listener` (function): Callback receiving new derived value

**Returns:** Unsubscribe function

**Behavior:**
- Only called when `Object.is(prev, next)` is false
- For objects, called when reference changes

---

### DerivedStore.destroy

Cleans up all subscriptions to source stores.

```typescript
derivedStore.destroy(): void
```

**Parameters:** None

**Returns:** void

**When to call:**
- Component unmount
- Dynamic derived store no longer needed
- Before garbage collection

---

### withPersist (from `@grimoire/clavicula-extras`)

Syncs store state with localStorage. SSR-safe (no-op if localStorage unavailable).

```typescript
import { withPersist } from '@grimoire/clavicula-extras';

function withPersist<T extends object>(
  store: Store<T>,
  key: string
): Store<T>
```

**Parameters:**
- `store` (Store): The store to persist
- `key` (string): localStorage key

**Returns:** The same store (now with persistence attached)

**Example:**
```javascript
const settings = withPersist(
  createStore({ theme: 'light', fontSize: 16 }),
  'user-settings'
);
```

**Behavior:**
- Loads from localStorage on call (if key exists)
- Saves to localStorage on every `set`
- Handles parse errors gracefully (warns to console)
- Returns same store reference (chainable)

---

### withBatching (from `@grimoire/clavicula-extras`)

Batches multiple synchronous set() calls into a single subscriber notification.

```typescript
import { withBatching } from '@grimoire/clavicula-extras';

function withBatching<T extends object>(store: Store<T>): Store<T>
```

**Parameters:**
- `store` (Store): The store to wrap

**Returns:** A new store with batched updates

**Example:**
```javascript
const store = withBatching(createStore({ x: 0, y: 0 }));

store.set({ x: 1 });
store.set({ y: 2 });
store.set(s => ({ x: s.x + 10 }));
// Subscribers notified once with { x: 11, y: 2 }
```

**Behavior:**
- Queues updates until next microtask
- Merges all queued partials into single set
- `get()` returns committed value (not optimistic/pending)
- Function partials see accumulated queued state
- Useful for vanilla JS and Svelte (React/Vue/Solid batch automatically)

**When to use:**
- Multiple rapid updates in event handlers
- Batch updates from async operations
- Reduce subscriber spam in animation loops

---

## Framework Adapters

### React

```typescript
import { useStore } from '@grimoire/clavicula-react';

function useStore<T extends object>(store: Store<T>): T;
function useStore<T extends object, R>(store: Store<T>, selector: (s: T) => R): R;
```

**Example:**
```jsx
function Counter() {
  const state = useStore(countStore);
  const count = useStore(countStore, s => s.count);
  return <span>{count}</span>;
}
```

### Vue

```typescript
import { useStore } from '@grimoire/clavicula-vue';

function useStore<T extends object>(store: Store<T>): Ref<T>;
function useStore<T extends object, R>(store: Store<T>, selector: (s: T) => R): Ref<R>;
```

**Example:**
```vue
<script setup>
const state = useStore(countStore);
</script>
<template>{{ state.count }}</template>
```

### Solid

```typescript
import { useStore } from '@grimoire/clavicula-solid';

function useStore<T extends object>(store: Store<T>): Accessor<T>;
```

**Example:**
```jsx
function Counter() {
  const state = useStore(countStore);
  return <span>{state().count}</span>;
}
```

### Angular

```typescript
import { toObservable, toSignal } from '@grimoire/clavicula-angular';

function toObservable<T>(store: Store<T>): Observable<T>;
function toSignal<T>(store: Store<T>): { signal: Signal<T>; destroy: () => void };
```

**Example:**
```typescript
@Component({ template: `{{ state.signal().count }}` })
export class Counter {
  state = toSignal(countStore);
  ngOnDestroy() { this.state.destroy(); }
}
```

### Svelte

No adapter needed. Use stores directly with `$` prefix.

```svelte
<script>
import { countStore } from './stores.js';
</script>
{$countStore.count}
```

---

## Common Patterns

### Pattern: Global Store Module

```javascript
// stores/counter.js
import { createStore } from '@grimoire/clavicula';

export const counterStore = createStore({ count: 0 });

export function increment() {
  counterStore.set(s => ({ count: s.count + 1 }));
}

export function decrement() {
  counterStore.set(s => ({ count: s.count - 1 }));
}
```

### Pattern: Persisted Settings

```javascript
import { createStore } from '@grimoire/clavicula';
import { withPersist } from '@grimoire/clavicula-extras';

export const settingsStore = withPersist(
  createStore({
    theme: 'system',
    language: 'en',
    notifications: true
  }),
  'app-settings'
);
```

### Pattern: Derived Computations

```javascript
import { createStore, derived } from '@grimoire/clavicula';

const cartStore = createStore({ items: [], coupon: null });

export const cartSummary = derived(cartStore, state => ({
  itemCount: state.items.length,
  subtotal: state.items.reduce((sum, i) => sum + i.price * i.qty, 0),
  discount: state.coupon?.percent ?? 0
}));
```

### Pattern: Multi-Store Derived

```javascript
const userStore = createStore({ id: null, tier: 'free' });
const cartStore = createStore({ items: [] });

const checkout = derived([userStore, cartStore], (user, cart) => ({
  canCheckout: user.id !== null && cart.items.length > 0,
  freeShipping: user.tier === 'premium' || cart.items.length > 5
}));
```

### Pattern: Web Component

```javascript
class MyElement extends HTMLElement {
  connectedCallback() {
    this._unsub = store.subscribe(s => this.render(s));
    this.render(store.get());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  render(state) {
    this.innerHTML = `<span>${state.value}</span>`;
  }
}
```

---

## Common Mistakes

### Mistake: Forgetting to Unsubscribe

```javascript
// WRONG: Memory leak
connectedCallback() {
  store.subscribe(s => this.render(s));
}

// CORRECT: Save and call unsubscribe
connectedCallback() {
  this._unsub = store.subscribe(s => this.render(s));
}
disconnectedCallback() {
  this._unsub?.();
}
```

### Mistake: Forgetting to Call destroy() on Derived

```javascript
// WRONG: Derived keeps listening to source stores
const filtered = derived(store, s => s.items.filter(i => i.active));
// Component unmounts, derived never cleaned up

// CORRECT: Call destroy when done
componentWillUnmount() {
  this.filtered.destroy();
}
```

### Mistake: Mutating State Directly

```javascript
// WRONG: Mutates without notifying
const state = store.get();
state.count = 5; // No subscribers notified!

// CORRECT: Use set()
store.set({ count: 5 });
```

### Mistake: Returning Same Reference in Derived

```javascript
// WRONG: Object.is sees same reference, no notification
const items = derived(store, s => s.items); // Same array ref
items.subscribe(() => console.log('Changed')); // Never fires if array mutated

// CORRECT: Return new reference
const items = derived(store, s => [...s.items]); // New array
// Or use primitives
const count = derived(store, s => s.items.length); // Primitive
```

### Mistake: Using withPersist with Sensitive Data

```javascript
import { withPersist } from '@grimoire/clavicula-extras';

// WRONG: Tokens in localStorage are XSS-vulnerable
const authStore = withPersist(createStore({ token: '...' }), 'auth');

// CORRECT: Don't persist sensitive data
const authStore = createStore({ token: '...' }); // Session only
```

### Mistake: Deep Nesting in Single Store

```javascript
// WRONG: Deep updates are verbose
store.set(s => ({
  user: {
    ...s.user,
    preferences: {
      ...s.user.preferences,
      theme: 'dark'
    }
  }
}));

// BETTER: Separate stores or flatten
const userStore = createStore({ id: 1, name: 'Alice' });
const prefsStore = createStore({ theme: 'light' });
prefsStore.set({ theme: 'dark' }); // Simple
```

### Mistake: Monolithic Store with Many Keys

```javascript
// WRONG: Every set() broadcasts all 50+ keys to every subscriber
const appStore = createStore({
  user: { id: 1, name: 'Alice', email: '...' },
  cart: { items: [], total: 0 },
  ui: { sidebarOpen: false, modal: null },
  settings: { theme: 'light', language: 'en' },
  // ... 40 more keys
});

// CORRECT: Separate by domain, derive when needed
const userStore = createStore({ id: 1, name: 'Alice' });
const cartStore = createStore({ items: [], total: 0 });
const uiStore = createStore({ sidebarOpen: false });

// Component needs multiple? Create focused derived store
const headerData = derived([userStore, cartStore], (user, cart) => ({
  userName: user.name,
  cartCount: cart.items.length
}));
```

**Why:** Every `set()` broadcasts full state to all subscribers. Monolithic stores are an antipattern regardless of tech stack—Clavicula just doesn't hide the cost.

**Rule of thumb:** If your store exceeds ~20-30 keys, split it.

### Mistake: Forgetting destroy() on Dynamic Derived Stores

```javascript
// WRONG: Derived store leaks, keeps listening to sources forever
class MyComponent extends HTMLElement {
  connectedCallback() {
    this._view = derived([storeA, storeB], (a, b) => ({ ... }));
    this._unsub = this._view.subscribe(s => this.render(s));
  }
  disconnectedCallback() {
    this._unsub?.(); // Only unsubscribes from derived, doesn't stop derived listening to sources!
  }
}

// CORRECT: Call destroy() to clean up derived's subscriptions to source stores
disconnectedCallback() {
  this._unsub?.();
  this._view?.destroy(); // Stops derived from listening to storeA and storeB
}
```

---

## Type Definitions Summary

### Core (`@grimoire/clavicula`)

```typescript
interface Store<T extends object> {
  get(): T;
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
}

interface DerivedStore<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
  destroy(): void;
}

function createStore<T extends object>(initialState: T): Store<T>;

function derived<S, T>(store: Subscribable<S>, fn: (state: S) => T): DerivedStore<T>;
function derived<S extends unknown[], T>(
  stores: { [K in keyof S]: Subscribable<S[K]> },
  fn: (...states: S) => T
): DerivedStore<T>;
```

### Extras (`@grimoire/clavicula-extras`)

```typescript
function withPersist<T extends object>(store: Store<T>, key: string): Store<T>;
function withBatching<T extends object>(store: Store<T>): Store<T>;
function withDistinct<T extends object>(store: Store<T>, isEqual?: (a: T, b: T) => boolean): Store<T>;
function withFreeze<T extends object>(store: Store<T>): Store<T>;
function withReset<T extends object>(store: Store<T>): Store<T> & { reset(): void };
function withLogging<T extends object>(store: Store<T>, label?: string): Store<T>;
function withHistory<T extends object>(store: Store<T>, maxSize?: number): Store<T> & {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
};
```

---

## Vocabulary Checklist

### Core (always available)

1. `createStore(initial)` - create store
2. `store.get()` - read state
3. `store.set(partial)` - update state
4. `store.subscribe(fn)` - listen to changes
5. `derived(stores, fn)` - create computed store
6. `derivedStore.destroy()` - cleanup derived

### Extras (import from `@grimoire/clavicula-extras`)

- `withPersist(store, key)` - localStorage sync
- `withBatching(store)` - batch store updates
- `withDistinct(store)` - block redundant updates
- `withFreeze(store)` - freeze state (dev only)
- `withReset(store)` - add reset()
- `withLogging(store)` - console logging
- `withHistory(store)` - undo/redo

Core is all you need. Extras are opt-in for specific use cases.
