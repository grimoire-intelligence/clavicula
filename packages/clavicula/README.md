# Clavicula

A minimal reactive state management library (~1KB) built on native EventTarget.

## Installation

```bash
npm install clavicula
```

## Usage

### Basic Store

```js
import { createStore } from 'clavicula';

const store = createStore({ count: 0, name: 'Alice' });

// Read state
console.log(store.get()); // { count: 0, name: 'Alice' }

// Update with partial object
store.set({ count: 1 });

// Update with function
store.set(state => ({ count: state.count + 1 }));

// Subscribe to changes
const unsubscribe = store.subscribe(state => {
  console.log('State changed:', state);
});

// Later: stop listening
unsubscribe();
```

### Derived Stores

Create computed values from one or more stores:

```js
import { createStore, derived } from 'clavicula';

const store = createStore({ items: [], filter: 'all' });

// Single dependency
const itemCount = derived(store, s => s.items.length);

// Multiple dependencies
const priceStore = createStore({ tax: 0.1 });
const cartStore = createStore({ subtotal: 100 });

const total = derived(
  [priceStore, cartStore],
  (price, cart) => cart.subtotal * (1 + price.tax)
);

console.log(total.get()); // 110

// Clean up when done
total.destroy();
```

Derived stores batch multiple synchronous source updates into a single recomputation, and only notify subscribers when the computed value actually changes (using `Object.is` comparison).

### Persistence

Sync store state with localStorage:

```js
import { createStore, withPersist } from 'clavicula';

const store = withPersist(
  createStore({ theme: 'light', lang: 'en' }),
  'user-prefs'
);

// State is loaded from localStorage on creation
// and saved automatically on every change
```

## Framework Adapters

| Package | Framework | Hook/Function |
|---------|-----------|---------------|
| `clavicula-react` | React 18+ | `useStore(store)` |
| `clavicula-vue` | Vue 3 | `useStore(store)` |
| `clavicula-solid` | Solid | `useStore(store)` |
| `clavicula-angular` | Angular 16+ | `toObservable(store)`, `toSignal(store)` |

### React

```jsx
import { createStore } from 'clavicula';
import { useStore } from 'clavicula-react';

const countStore = createStore({ count: 0 });

function Counter() {
  const { count } = useStore(countStore);
  return <button onClick={() => countStore.set({ count: count + 1 })}>{count}</button>;
}
```

### Vue

```vue
<script setup>
import { createStore } from 'clavicula';
import { useStore } from 'clavicula-vue';

const countStore = createStore({ count: 0 });
const state = useStore(countStore);
</script>

<template>
  <button @click="countStore.set({ count: state.count + 1 })">{{ state.count }}</button>
</template>
```

### Solid

```jsx
import { createStore } from 'clavicula';
import { useStore } from 'clavicula-solid';

const countStore = createStore({ count: 0 });

function Counter() {
  const state = useStore(countStore);
  return <button onClick={() => countStore.set({ count: state().count + 1 })}>{state().count}</button>;
}
```

### Angular

```typescript
import { Component, computed } from '@angular/core';
import { createStore } from 'clavicula';
import { toSignal } from 'clavicula-angular';

const countStore = createStore({ count: 0 });

@Component({
  template: `<button (click)="increment()">{{ count() }}</button>`
})
export class CounterComponent {
  private state = toSignal(countStore);
  count = computed(() => this.state.signal().count);

  increment() {
    countStore.set(s => ({ count: s.count + 1 }));
  }

  ngOnDestroy() {
    this.state.destroy();
  }
}
```

## API

### `createStore<T>(initial: T): Store<T>`

Creates a reactive store.

- `get(): T` - Returns current state
- `set(partial | updater)` - Updates state
- `subscribe(fn): unsubscribe` - Listen to changes

### `derived(stores, fn): DerivedStore<T>`

Creates a read-only computed store.

- `get(): T` - Returns current derived value
- `subscribe(fn): unsubscribe` - Listen to changes
- `destroy()` - Clean up subscriptions

### `withPersist(store, key): Store<T>`

Adds localStorage persistence to a store.

## License

MIT
