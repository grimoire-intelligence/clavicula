# Clavicula PRD

**Package:** `@grimoire/clavicula`

## Overview

A framework-agnostic reactive state management library designed for Web Components and vanilla JavaScript. The library prioritizes AI-digestible APIs through minimal surface area, closed vocabularies, and adherence to the Unix philosophy.

## Design Principles

This library is **AI-native**—designed for maximal comprehension by both humans and language models.

1. **Platform before framework** — The platform is better-documented and -optimized than any abstraction over it. We use browser primitives (`EventTarget`, `CustomEvent`) rather than inventing machinery. The result is debuggable in DevTools and interoperable with anything that speaks DOM events. Primitives change rarely, behave predictably, and save maintenance time.

2. **Composition before configuration** — The smaller and more predictable each step, the more reliably it can be comprehended. No options objects, no modes, no flags. Features like persistence or logging are external decorators that wrap stores, not internal behaviors toggled by configuration. Prefer Unix pipes and pure-function composition over context-sensitive black boxes.

3. **Memory before reasoning** — An API surface must fit entirely in context. Hallucination happens when the model must *guess* instead of knowing. The complete API must fit in working memory without risk of inventing method signatures. Every method signature is predictable; there are no overloads or polymorphic behaviors requiring contextual reasoning. Grimoire products depend only on the platform and other Grimoire products.

## Package Structure

```
@grimoire/clavicula          # Core + derived + persist, single import
@grimoire/clavicula-react    # React adapter
@grimoire/clavicula-vue      # Vue adapter
@grimoire/clavicula-solid    # Solid adapter
@grimoire/clavicula-angular  # Angular adapter (RxJS Observable)
```

Svelte needs no adapter—Clavicula's `subscribe` contract is Svelte-native. If you're using Alpine, just use Alpine's store, which is already compatible with Alpine's reactivity model.

### Core Package Layout

```
@grimoire/clavicula/
├── index.js       # Exports createStore, derived, withPersist
├── index.d.ts     # All type declarations
└── package.json
```

All functionality in one file. No subpath imports to remember.

---

## Module: index.js

The entire library in ~60 lines.

### `createStore(initialState) → Store`

Creates a reactive store backed by `EventTarget`.

**Parameters:**
- `initialState: object` — Initial state. Must be a plain object.

**Returns:** `Store`

**Store interface:**
```typescript
interface Store<T> {
  get(): T;
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
}
```

**Implementation:**

```javascript
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
      return () => bus.removeEventListener('change', handler);
    }
  };
}
```

**Rationale:**
- `EventTarget` is a platform primitive; no custom pub/sub needed (**platform before framework**)
- Three methods, no options (**composition before configuration**)
- Entire API visible above; nothing to hallucinate (**memory before reasoning**)

**Usage:**

```javascript
import { createStore } from '@grimoire/clavicula';

const store = createStore({ count: 0, user: null });

// Read
console.log(store.get().count);

// Write (partial update)
store.set({ count: 1 });

// Write (functional update)
store.set(s => ({ count: s.count + 1 }));

// Subscribe
const unsubscribe = store.subscribe(state => {
  console.log('State changed:', state);
});

// Cleanup
unsubscribe();
```

---

### `derived(stores, fn) → DerivedStore`

Creates a read-only store whose value is computed from one or more source stores.

**Parameters:**
- `stores: Store | Store[]` — One or more source stores
- `fn: (...values) => T` — Derivation function receiving current values of all source stores

**Returns:** `DerivedStore`

**DerivedStore interface:**
```typescript
interface DerivedStore<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
  destroy(): void;
}
```

Note: No `set` method. Derived stores are read-only.

**Implementation:**

```javascript
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
      return () => listeners.delete(fn);
    },

    destroy() {
      unsubs.forEach(fn => fn());
      listeners.clear();
    }
  };
}
```

**Rationale:**
- Same `get`/`subscribe` interface as base store (closed vocabulary)
- `Object.is` check prevents spurious updates without deep comparison complexity
- Eager evaluation keeps mental model simple; value is always current
- `destroy()` enables cleanup for dynamically-created derivations

**Usage:**

```javascript
import { createStore, derived } from '@grimoire/clavicula';

const cart = createStore({ items: [], discount: 0 });
const user = createStore({ name: 'Alice', tier: 'premium' });

// Single dependency
const itemCount = derived(cart, state => state.items.length);

// Multiple dependencies
const summary = derived([cart, user], (cartState, userState) => ({
  total: cartState.items.reduce((sum, i) => sum + i.price, 0),
  customer: userState.name,
  hasDiscount: userState.tier === 'premium'
}));

// Subscribe to derived values
summary.subscribe(s => console.log('Summary updated:', s));

// Read current derived value
console.log(itemCount.get());
```

---

### `withPersist(store, key) → Store`

Decorator that syncs a store with `localStorage`.

**Parameters:**
- `store: Store` — The store to persist
- `key: string` — localStorage key

**Returns:** The same store (mutated to add persistence)

**Implementation:**

```javascript
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
```

**Rationale:**
- Decorator pattern, not a configuration option (**composition before configuration**)
- Returns the store for chaining
- Fails gracefully on corrupt data

**Usage:**

```javascript
import { createStore, withPersist } from '@grimoire/clavicula';

const settings = withPersist(
  createStore({ theme: 'light', fontSize: 16 }),
  'app-settings'
);
```

---

## Web Components Integration

Standard pattern for connecting stores to Web Components:

```javascript
import { createStore } from '@grimoire/clavicula';

const appState = createStore({ count: 0 });

class MyCounter extends HTMLElement {
  connectedCallback() {
    this._unsub = appState.subscribe(state => this.render(state));
    this.render(appState.get());
  }

  disconnectedCallback() {
    this._unsub?.();
  }

  render(state) {
    this.innerHTML = `
      <span>${state.count}</span>
      <button data-action="increment">+</button>
    `;
  }

  constructor() {
    super();
    this.addEventListener('click', e => {
      if (e.target.dataset.action === 'increment') {
        appState.set(s => ({ count: s.count + 1 }));
      }
    });
  }
}

customElements.define('my-counter', MyCounter);
```

**Pattern notes:**
- Subscribe in `connectedCallback`, unsubscribe in `disconnectedCallback`
- Initial render with `store.get()` ensures no flash of empty content
- Event delegation on the component root; no per-element listeners

---

## Complete API Reference

### Vocabulary (7 items total)

| Export | Source | Type | Description |
|--------|--------|------|-------------|
| `createStore` | @grimoire/clavicula | function | Create a reactive store |
| `get` | Store method | function | Read current state |
| `set` | Store method | function | Update state |
| `subscribe` | Store/DerivedStore method | function | Listen for changes |
| `derived` | @grimoire/clavicula | function | Create computed store |
| `destroy` | DerivedStore method | function | Cleanup derived store |
| `withPersist` | @grimoire/clavicula | function | Add localStorage sync |

This is the **complete** API. There are no other methods, options, or behaviors.

---

## What This Library Does NOT Do

Intentionally omitted to maintain a closed vocabulary:

- **No dedicated selector API** — `derived(store, s => s.x)` already does the same work without expanding the vocabulary
- **No middleware system** — Write decorators like `withPersist`
- **No Redux-style actions/reducers** — Just call `set` with the new state
- **No devtools integration** — Use browser's Event Listeners panel; stores use `EventTarget`
- **No immer/immutability helpers** — Spread syntax is sufficient; keeps mental model simple
- **No async handling** — Call `set` when your promise resolves; no magic

Framework bindings exist as separate packages (see Appendix) but are thin wrappers over the core `subscribe` contract.

---

## Testing Strategy

All functions are pure at their boundaries; testing is straightforward:

```javascript
import { createStore, derived } from '@grimoire/clavicula';

// Test createStore
const store = createStore({ x: 1 });
assert(store.get().x === 1);

store.set({ x: 2 });
assert(store.get().x === 2);

store.set(s => ({ x: s.x + 1 }));
assert(store.get().x === 3);

let called = 0;
const unsub = store.subscribe(() => called++);
store.set({ x: 4 });
assert(called === 1);
unsub();
store.set({ x: 5 });
assert(called === 1); // No longer subscribed

// Test derived
const base = createStore({ a: 1, b: 2 });
const sum = derived(base, s => s.a + s.b);
assert(sum.get() === 3);

base.set({ a: 10 });
assert(sum.get() === 12);

// Test derived doesn't fire on same value
let derivedCalls = 0;
sum.subscribe(() => derivedCalls++);
base.set({ a: 10 }); // Same value
assert(derivedCalls === 0);

base.set({ a: 11 }); // Different value
assert(derivedCalls === 1);
```

---

## Type Declarations

Ship `index.d.ts` alongside `index.js`. No TypeScript compilation required; hand-written declarations for typeless JS.

### index.d.ts

```typescript
// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export interface Store<T extends object> {
  /** Returns current state */
  get(): T;
  
  /** Updates state with partial object or updater function */
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  
  /** Subscribes to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: T) => void): () => void;
}

/** Creates a reactive store backed by EventTarget */
export function createStore<T extends object>(initialState: T): Store<T>;

// ─────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────

export interface DerivedStore<T> {
  /** Returns current derived value */
  get(): T;
  
  /** Subscribes to derived value changes. Returns unsubscribe function. */
  subscribe(listener: (value: T) => void): () => void;
  
  /** Cleans up all subscriptions to source stores */
  destroy(): void;
}

/** Creates a read-only store computed from one source store */
export function derived<S extends object, T>(
  store: Store<S>,
  fn: (state: S) => T
): DerivedStore<T>;

/** Creates a read-only store computed from multiple source stores */
export function derived<S extends object[], T>(
  stores: { [K in keyof S]: Store<S[K]> },
  fn: (...states: S) => T
): DerivedStore<T>;

// ─────────────────────────────────────────────────────────────
// Persist
// ─────────────────────────────────────────────────────────────

/** Syncs store state with localStorage under the given key */
export function withPersist<T extends object>(
  store: Store<T>,
  key: string
): Store<T>;
```

---

## File Checklist for Implementation

### @grimoire/clavicula (core)

- [ ] `index.js` — All exports: createStore, derived, withPersist (~60 lines)
- [ ] `index.d.ts` — All type declarations
- [ ] `index.test.js` — Tests for all functionality
- [ ] `package.json` — ES modules config
- [ ] `README.md` — Usage examples, design principles

### @grimoire/clavicula-react

- [ ] `index.js` — useStore hook (~5 lines)
- [ ] `index.d.ts` — Type declarations
- [ ] `package.json` — Peer deps: react, @grimoire/clavicula

### @grimoire/clavicula-vue

- [ ] `index.js` — useStore composable (~6 lines)
- [ ] `index.d.ts` — Type declarations
- [ ] `package.json` — Peer deps: vue, @grimoire/clavicula

### @grimoire/clavicula-solid

- [ ] `index.js` — useStore primitive (~4 lines)
- [ ] `index.d.ts` — Type declarations
- [ ] `package.json` — Peer deps: solid-js, @grimoire/clavicula

### @grimoire/clavicula-angular

- [ ] `index.js` — toObservable, toSignal (~10 lines)
- [ ] `index.d.ts` — Type declarations
- [ ] `package.json` — Peer deps: @angular/core, rxjs, @grimoire/clavicula

---

## Package.json Structures

### @grimoire/clavicula

```json
{
  "name": "@grimoire/clavicula",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "default": "./index.js"
    }
  },
  "files": ["index.js", "index.d.ts"],
  "sideEffects": false
}
```

### @grimoire/clavicula-react

```json
{
  "name": "@grimoire/clavicula-react",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "peerDependencies": {
    "@grimoire/clavicula": ">=0.1.0",
    "react": ">=18.0.0"
  },
  "files": ["index.js", "index.d.ts"],
  "sideEffects": false
}
```

### @grimoire/clavicula-vue

```json
{
  "name": "@grimoire/clavicula-vue",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "peerDependencies": {
    "@grimoire/clavicula": ">=0.1.0",
    "vue": ">=3.0.0"
  },
  "files": ["index.js", "index.d.ts"],
  "sideEffects": false
}
```

### @grimoire/clavicula-solid

```json
{
  "name": "@grimoire/clavicula-solid",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "peerDependencies": {
    "@grimoire/clavicula": ">=0.1.0",
    "solid-js": ">=1.0.0"
  },
  "files": ["index.js", "index.d.ts"],
  "sideEffects": false
}
```

### @grimoire/clavicula-angular

```json
{
  "name": "@grimoire/clavicula-angular",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "types": "index.d.ts",
  "peerDependencies": {
    "@grimoire/clavicula": ">=0.1.0",
    "@angular/core": ">=16.0.0",
    "rxjs": ">=7.0.0"
  },
  "files": ["index.js", "index.d.ts"],
  "sideEffects": false
}
```

---

## Appendix: Framework Adapters

Each adapter bridges Clavicula's `subscribe` contract to the framework's native reactivity primitive. **Composition before configuration**—these chain existing tools rather than inventing new machinery.

### @grimoire/clavicula-react

Uses React 18's `useSyncExternalStore`—the platform answer for external stores.

**index.js:**
```javascript
import { useSyncExternalStore } from 'react';

export function useStore(store, selector = s => s) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get())
  );
}
```

**index.d.ts:**
```typescript
import type { Store, DerivedStore } from '@grimoire/clavicula';

export function useStore<T extends object>(store: Store<T>): T;
export function useStore<T extends object, R>(store: Store<T>, selector: (state: T) => R): R;
export function useStore<T>(store: DerivedStore<T>): T;
export function useStore<T, R>(store: DerivedStore<T>, selector: (value: T) => R): R;
```

**Usage:**
```jsx
import { useStore } from '@grimoire/clavicula-react';
import { cartStore } from './stores.js';

function Cart() {
  const cart = useStore(cartStore);
  const itemCount = useStore(cartStore, s => s.items.length);
  
  return <span>{itemCount} items</span>;
}
```

---

### @grimoire/clavicula-vue

Bridges to Vue's `shallowRef` for reactive bindings.

**index.js:**
```javascript
import { shallowRef, onUnmounted } from 'vue';

export function useStore(store, selector = s => s) {
  const state = shallowRef(selector(store.get()));
  const unsub = store.subscribe(s => state.value = selector(s));
  onUnmounted(unsub);
  return state;
}
```

**index.d.ts:**
```typescript
import type { Ref } from 'vue';
import type { Store, DerivedStore } from '@grimoire/clavicula';

export function useStore<T extends object>(store: Store<T>): Ref<T>;
export function useStore<T extends object, R>(store: Store<T>, selector: (state: T) => R): Ref<R>;
export function useStore<T>(store: DerivedStore<T>): Ref<T>;
export function useStore<T, R>(store: DerivedStore<T>, selector: (value: T) => R): Ref<R>;
```

**Usage:**
```vue
<script setup>
import { useStore } from '@grimoire/clavicula-vue';
import { cartStore } from './stores.js';

const cart = useStore(cartStore);
const itemCount = useStore(cartStore, s => s.items.length);
</script>

<template>
  <span>{{ itemCount }} items</span>
</template>
```

---

### @grimoire/clavicula-solid

Bridges to Solid's signals.

**index.js:**
```javascript
import { createSignal, onCleanup } from 'solid-js';

export function useStore(store, selector = s => s) {
  const [state, setState] = createSignal(selector(store.get()));
  onCleanup(store.subscribe(s => setState(() => selector(s))));
  return state;
}
```

**index.d.ts:**
```typescript
import type { Accessor } from 'solid-js';
import type { Store, DerivedStore } from '@grimoire/clavicula';

export function useStore<T extends object>(store: Store<T>): Accessor<T>;
export function useStore<T extends object, R>(store: Store<T>, selector: (state: T) => R): Accessor<R>;
export function useStore<T>(store: DerivedStore<T>): Accessor<T>;
export function useStore<T, R>(store: DerivedStore<T>, selector: (value: T) => R): Accessor<R>;
```

**Usage:**
```jsx
import { useStore } from '@grimoire/clavicula-solid';
import { cartStore } from './stores.js';

function Cart() {
  const cart = useStore(cartStore);
  const itemCount = useStore(cartStore, s => s.items.length);
  
  return <span>{itemCount()} items</span>;
}
```

---

### @grimoire/clavicula-angular

Bridges to RxJS Observable (for templates) and Angular 16+ signals. Angular's DI system means we export functions rather than hooks.

**index.js:**
```javascript
import { Observable } from 'rxjs';
import { signal } from '@angular/core';

export function toObservable(store) {
  return new Observable(subscriber => {
    subscriber.next(store.get());
    return store.subscribe(state => subscriber.next(state));
  });
}

export function toSignal(store) {
  const sig = signal(store.get());
  store.subscribe(state => sig.set(state));
  return sig;
}
```

**index.d.ts:**
```typescript
import type { Observable } from 'rxjs';
import type { Signal } from '@angular/core';
import type { Store, DerivedStore } from '@grimoire/clavicula';

type AnyStore<T> = Store<T> | DerivedStore<T>;

export function toObservable<T>(store: AnyStore<T>): Observable<T>;
export function toSignal<T>(store: AnyStore<T>): Signal<T>;
```

**Usage (Observable + async pipe):**
```typescript
import { Component } from '@angular/core';
import { toObservable } from '@grimoire/clavicula-angular';
import { cartStore } from './stores';

@Component({
  selector: 'app-cart',
  template: `<span>{{ (cart$ | async)?.items?.length }} items</span>`
})
export class CartComponent {
  cart$ = toObservable(cartStore);
}
```

**Usage (Signal, Angular 16+):**
```typescript
import { Component } from '@angular/core';
import { toSignal } from '@grimoire/clavicula-angular';
import { cartStore } from './stores';

@Component({
  selector: 'app-cart',
  template: `<span>{{ cart().items.length }} items</span>`
})
export class CartComponent {
  cart = toSignal(cartStore);
}
```

---

### Svelte (No Adapter Needed)

Clavicula stores implement Svelte's store contract natively. Just use the `$` prefix.

**Usage:**
```svelte
<script>
  import { cartStore } from './stores.js';
</script>

<span>{$cartStore.items.length} items</span>
```

This works because Svelte's store contract requires only a `subscribe` method that returns an unsubscribe function—exactly what Clavicula provides. **Platform before framework.**