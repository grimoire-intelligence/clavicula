# Clavicula

A minimal, AI-native reactive state management library (~1KB) built on native EventTarget.

Clavicula is designed for **maximal comprehension by both humans and language models**. The entire API fits in working memory, uses platform primitives, and requires no special knowledge to use correctly.

## Installation

```bash
# Core library
npm install @grimoire/clavicula

# Framework adapters (pick one)
npm install @grimoire/clavicula-react
npm install @grimoire/clavicula-vue
npm install @grimoire/clavicula-solid
npm install @grimoire/clavicula-angular
```

**Note:** Svelte requires no adapter. Clavicula's `subscribe` contract is Svelte-native.

## Quick Start

```javascript
import { createStore, derived, withPersist } from '@grimoire/clavicula';

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

// Persistence
const settings = withPersist(createStore({ theme: 'light' }), 'settings');
```

## Why Clavicula?

### Comparison with Zustand and Redux

| Aspect | Clavicula | Zustand | Redux |
|--------|-----------|---------|-------|
| **Bundle size** | ~1KB | ~2KB | ~10KB+ |
| **API surface** | 7 items | ~15 items | 50+ items |
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

1. **Complete API in context** — The entire library (7 vocabulary items) fits in any LLM's working memory. No hallucinated methods, no invented patterns.

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

The pattern scales to any complexity: derived stores can depend on other derived stores, creating efficient computation graphs where each node only updates when its inputs change.

## API Reference

### Complete Vocabulary (7 items)

| Export | Type | Description |
|--------|------|-------------|
| `createStore(initial)` | function | Create a reactive store |
| `store.get()` | method | Read current state |
| `store.set(partial)` | method | Update state |
| `store.subscribe(fn)` | method | Listen for changes, returns unsubscribe |
| `derived(stores, fn)` | function | Create computed store |
| `derivedStore.destroy()` | method | Cleanup derived subscriptions |
| `withPersist(store, key)` | function | Add localStorage sync |

This is the **complete** API. There are no other methods, options, or behaviors.

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

- **No selectors with equality functions** — Use `derived` for computed slices
- **No middleware system** — Write decorators like `withPersist`
- **No Redux-style actions/reducers** — Just call `set` with the new state
- **No devtools integration** — Use browser's Event Listeners panel
- **No immer/immutability helpers** — Spread syntax is sufficient
- **No async handling** — Call `set` when your promise resolves

## Packages

| Package | Description |
|---------|-------------|
| `@grimoire/clavicula` | Core library: createStore, derived, withPersist |
| `@grimoire/clavicula-react` | React adapter: useStore hook |
| `@grimoire/clavicula-vue` | Vue 3 adapter: useStore composable |
| `@grimoire/clavicula-solid` | Solid adapter: useStore primitive |
| `@grimoire/clavicula-angular` | Angular adapter: toObservable, toSignal |

## Documentation

- [Architecture Decisions](./docs/architecture.md) — Why EventTarget? Why Object.is? Design rationale.
- [Agent Skill](./docs/clavicula.skill.md) — Machine-readable API reference for AI assistants.
- [PRD](./docs/prd.md) — Original product requirements document.

## License

MIT
