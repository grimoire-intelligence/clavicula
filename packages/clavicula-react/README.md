# @grimoire-intel/clavicula-react

React adapter for [Clavicula](https://github.com/grimoire-intelligence/clavicula).

## Installation

```bash
npm install @grimoire-intel/clavicula @grimoire-intel/clavicula-react
```

## Usage

```jsx
import { createStore, useStore } from '@grimoire-intel/clavicula-react';

const counterStore = createStore({ count: 0 });

function Counter() {
  const { count } = useStore(counterStore);

  return (
    <button onClick={() => counterStore.set(s => ({ count: s.count + 1 }))}>
      Count: {count}
    </button>
  );
}
```

### With selector

```jsx
// Only re-render when `count` changes
const count = useStore(counterStore, s => s.count);
```

### With derived stores

```jsx
import { createStore, derived, useStore } from '@grimoire-intel/clavicula-react';

const counterStore = createStore({ count: 0 });
const doubled = derived(counterStore, s => s.count * 2);

function Doubled() {
  const value = useStore(doubled);
  return <span>{value}</span>;
}
```

## API

```typescript
function useStore<T>(store: Store<T>): T;
function useStore<T, U>(store: Store<T>, selector: (state: T) => U): U;
```

Uses `useSyncExternalStore` internally for concurrent-safe subscriptions.

See the [main documentation](https://github.com/grimoire-intelligence/clavicula) for full API reference.
