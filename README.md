# Clavicula

A minimal, AI-native reactive state management library (~700 bytes core) built on native EventTarget.

Clavicula is designed for **maximal comprehension by both humans and language models**. The entire API fits in working memory, uses platform primitives, and requires no special knowledge to use correctly.

## Installation

```bash
# Core library
npm install @grimoire/clavicula

# Optional decorators (persistence, batching, history, etc.)
npm install @grimoire/clavicula-extras

# Framework adapters (pick one)
npm install @grimoire/clavicula-react
npm install @grimoire/clavicula-vue
npm install @grimoire/clavicula-solid
npm install @grimoire/clavicula-angular
```

**Note:** Svelte requires no adapter. Clavicula's `subscribe` contract is Svelte-native. If you're using Alpine, just use Alpine's store; when you've already paid for its reactivity model, its native store is smaller.

## Quick Start

```javascript
import { createStore, derived } from '@grimoire/clavicula';
import { withPersist, withBatching } from '@grimoire/clavicula-extras';

// Create a store
const store = createStore({ count: 0, user: null });

// Read state
console.log(store.get().count); // 0

// Update state (partial or functional)
store.set({ count: 1 });
store.set(s => ({ count: s.count + 1 }));

// Subscribe to changes
const unsubscribe = store.subscribe(state => console.log(state));
unsubscribe(); // cleanup

// Derived (computed) stores
const doubled = derived(store, s => s.count * 2);

// Persistence (from extras)
const settings = withPersist(createStore({ theme: 'light' }), 'settings');

// Batching (from extras, for vanilla JS/Svelte; React/Vue/Solid batch automatically)
const batched = withBatching(createStore({ x: 0, y: 0 }));
batched.set({ x: 1 });
batched.set({ y: 2 });
// Subscribers notified once with { x: 1, y: 2 }
```

## Why Clavicula?

### Comparison with Zustand and Redux

| Aspect | Clavicula | Zustand | Redux |
|--------|-----------|---------|-------|
| **Bundle size** | ~670B core | ~2KB | ~10KB+ |
| **API surface** | 6 core items | ~15 items | 50+ items |
| **Learning curve** | Minutes | Hours | Days |
| **Concepts** | get/set/subscribe | Stores, selectors, middleware | Actions, reducers, dispatch, thunks |
| **Dependencies** | None (platform only) | None | immer, redux-toolkit recommended |
| **TypeScript** | Inferred | Inferred | Complex setup |
| **Framework lock-in** | None | React-first | React-first |
| **Middleware** | Decorators (compose) | Built-in system | Built-in system |
| **DevTools** | Browser EventTarget panel | Custom extension | Custom extension |
| **AI comprehension** | Complete in context | Requires examples | Requires documentation |

### The AI-Native Advantage

Modern development increasingly involves AI assistants writing and modifying code. Clavicula is built from the ground up for this reality:

1. **Complete API in context** — The entire core library (6 vocabulary items) fits in any LLM's working memory. No hallucinated methods, no invented patterns.

2. **Platform primitives** — Uses `EventTarget` and `CustomEvent`, which every language model knows from web platform documentation. No proprietary concepts to learn.

3. **Predictable signatures** — Every method does exactly one thing with no overloads or polymorphic behaviors. `get()` returns state. `set()` updates state. `subscribe()` listens.

4. **Composition over configuration** — No options objects, modes, or flags. Features like persistence are external decorators that wrap stores, not internal behaviors toggled by configuration.

When an AI assistant encounters Clavicula code, it can:
- Immediately understand the state flow
- Write correct mutations without documentation
- Debug issues using standard browser tools
- Extend functionality through simple composition

### Memoized Selectors

Other libraries advertise "atomic selectors with automatic memoization" as a feature requiring special APIs. In Clavicula, this is just `derived`:

```javascript
const store = createStore({
  users: [{ id: 1, name: 'Alice', active: true }, { id: 2, name: 'Bob', active: false }],
  filter: 'all'
});

// Memoized selector: only recomputes when users or filter change
const visibleUsers = derived(store, s =>
  s.filter === 'all' ? s.users : s.users.filter(u => u.active)
);

// Primitive selector: only notifies when count actually changes
const userCount = derived(store, s => s.users.length);

// Multi-store selector: combines data from multiple sources
const cartStore = createStore({ items: [] });
const userStore = createStore({ discount: 0 });

const total = derived([cartStore, userStore], (cart, user) =>
  cart.items.reduce((sum, i) => sum + i.price, 0) * (1 - user.discount)
);
```

Components subscribing to `userCount` won't re-render when a user's name changes—only when the count changes. This is the same optimization other libraries provide through specialized selector APIs, but achieved with the same `derived` function you already know.

**Note on filtered arrays:** By default, `derived` uses `Object.is` for equality, which compares by reference. Filtered arrays always create new references, so subscribers get notified even when contents are identical. For array-returning derivations, pass a custom equality function:

```javascript
const shallowArrayEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const activeUsers = derived(
  store,
  s => s.users.filter(u => u.active),
  shallowArrayEqual
);
```

The pattern scales to any complexity: derived stores can depend on other derived stores, creating efficient computation graphs where each node only updates when its inputs change.

## API Reference

### Core (`@grimoire/clavicula`)

| Export | Type | Description |
|--------|------|-------------|
| `createStore(initial)` | function | Create a reactive store |
| `store.get()` | method | Read current state |
| `store.set(partial)` | method | Update state |
| `store.subscribe(fn)` | method | Listen for changes, returns unsubscribe |
| `derived(stores, fn, isEqual?)` | function | Create computed store |
| `derivedStore.destroy()` | method | Cleanup derived subscriptions |

### Extras (`@grimoire/clavicula-extras`)

| Export | Description |
|--------|-------------|
| `withPersist(store, key)` | localStorage sync (SSR-safe) |
| `withBatching(store)` | Batch updates into single notification |
| `withDistinct(store, isEqual?)` | Block redundant updates via equality check |
| `withFreeze(store)` | Deep freeze state to catch mutations (dev only, no-op in prod) |
| `withReset(store)` | Add `reset()` to restore initial state |
| `withLogging(store, label?)` | Log state changes to console |
| `withHistory(store, maxSize?)` | Undo/redo with `undo()`, `redo()`, `canUndo()`, `canRedo()` |

Decorators are composable. See [Writing Decorators](./docs/decorators.md) for patterns and composition order.

## Framework Integration

### React

```jsx
import { useStore } from '@grimoire/clavicula-react';
import { appStore } from './stores';

function Counter() {
  const state = useStore(appStore);
  const count = useStore(appStore, s => s.count); // with selector

  return <button onClick={() => appStore.set(s => ({ count: s.count + 1 }))}>{count}</button>;
}
```

### Vue

```vue
<script setup>
import { useStore } from '@grimoire/clavicula-vue';
import { appStore } from './stores';

const state = useStore(appStore);
</script>

<template>
  <button @click="appStore.set(s => ({ count: s.count + 1 }))">{{ state.count }}</button>
</template>
```

### Solid

```jsx
import { useStore } from '@grimoire/clavicula-solid';
import { appStore } from './stores';

function Counter() {
  const state = useStore(appStore);
  return <button onClick={() => appStore.set(s => ({ count: s.count + 1 }))}>{state().count}</button>;
}
```

### Angular

```typescript
import { toSignal } from '@grimoire/clavicula-angular';
import { appStore } from './stores';

@Component({
  template: `<button (click)="increment()">{{ state.signal().count }}</button>`
})
export class Counter {
  state = toSignal(appStore);
  increment() { appStore.set(s => ({ count: s.count + 1 })); }
  ngOnDestroy() { this.state.destroy(); }
}
```

### Svelte (No Adapter Needed)

```svelte
<script>
import { appStore } from './stores.js';
</script>

<button on:click={() => appStore.set(s => ({ count: s.count + 1 }))}>
  {$appStore.count}
</button>
```

## Web Components Integration

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

## What This Library Does NOT Do

Intentionally omitted to maintain a closed vocabulary:

- **No dedicated selector API** — `derived(store, s => s.x)` already does the same work without expanding the vocabulary
- **No middleware system** — Write decorators like `withPersist`
- **No Redux-style actions/reducers** — Just call `set` with the new state
- **No devtools integration** — Use browser's Event Listeners panel
- **No immer/immutability helpers** — Spread syntax is sufficient
- **No async handling** — Call `set` when your promise resolves

## Avoid Monolithic Stores

If your store has more than ~20-30 keys, stop. This is an antipattern regardless of your tech stack—Clavicula just doesn't help you pretend otherwise.

**Why it matters:** Every `set()` broadcasts full state to all subscribers. A 1000-key central store means every update ships 1000 keys to every listener, even if they only care about one.

**The fix:** Separate concerns into multiple smaller stores. If a component needs data from several stores, create a `derived` store:

```javascript
// Instead of one massive store...
const appStore = createStore({ user: {...}, cart: {...}, ui: {...}, ... });

// ...separate by domain
const userStore = createStore({ id: null, name: '', preferences: {} });
const cartStore = createStore({ items: [], coupon: null });
const uiStore = createStore({ sidebarOpen: false, theme: 'light' });

// Component needs both? Derive what you need
const checkoutView = derived([userStore, cartStore], (user, cart) => ({
  userName: user.name,
  itemCount: cart.items.length,
  canCheckout: user.id !== null && cart.items.length > 0
}));
```

**Critical:** Derived stores subscribe to their sources. In Web Components, always clean up:

```javascript
class CheckoutPanel extends HTMLElement {
  connectedCallback() {
    this._derived = derived([userStore, cartStore], (u, c) => ({ ... }));
    this._unsub = this._derived.subscribe(state => this.render(state));
    this.render(this._derived.get());
  }

  disconnectedCallback() {
    this._unsub?.();
    this._derived?.destroy(); // Essential: prevents memory leak
  }
}
```

## Packages

| Package | Size | Description |
|---------|------|-------------|
| `@grimoire/clavicula` | ~700B | Core: createStore, derived |
| `@grimoire/clavicula-extras` | ~1.6KB (tree-shakeable) | Decorators: withPersist, withBatching, withHistory, etc. |
| `@grimoire/clavicula-react` | ~190B | React adapter: useStore hook |
| `@grimoire/clavicula-vue` | ~150B | Vue 3 adapter: useStore composable |
| `@grimoire/clavicula-solid` | ~140B | Solid adapter: useStore primitive |
| `@grimoire/clavicula-angular` | ~270B | Angular adapter: toObservable, toSignal |

## Documentation

- [Architecture Decisions](./docs/architecture.md) — Why EventTarget? Why Object.is? Design rationale.
- [Writing Decorators](./docs/decorators.md) — How to create custom decorators and composition order.
- [Agent Skill](./docs/clavicula.skill.md) — Machine-readable API reference for AI assistants.
- [PRD](./docs/prd.md) — Original product requirements document.

## License

MIT
