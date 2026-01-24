# @grimoire-intel/clavicula-solid

Solid adapter for [Clavicula](https://github.com/grimoire-intelligence/clavicula).

## Installation

```bash
npm install @grimoire-intel/clavicula @grimoire-intel/clavicula-solid
```

## Usage

```jsx
import { createStore, useStore } from '@grimoire-intel/clavicula-solid';

const counterStore = createStore({ count: 0 });

function Counter() {
  const state = useStore(counterStore);

  return (
    <button onClick={() => counterStore.set(s => ({ count: s.count + 1 }))}>
      Count: {state().count}
    </button>
  );
}
```

### With selector

```jsx
const count = useStore(counterStore, s => s.count);

// In JSX - note the function call
<span>{count()}</span>
```

## API

```typescript
function useStore<T>(store: Store<T>): Accessor<T>;
function useStore<T, U>(store: Store<T>, selector: (state: T) => U): Accessor<U>;
```

Returns a Solid `Accessor` that updates when the store changes. Automatically cleans up on disposal.

See the [main documentation](https://github.com/grimoire-intelligence/clavicula) for full API reference.
