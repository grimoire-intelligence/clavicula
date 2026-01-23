# @grimoire-intel/clavicula-extras

Optional decorators for [Clavicula](https://github.com/grimoire-intelligence/clavicula) stores.

## Installation

```bash
npm install @grimoire-intel/clavicula @grimoire-intel/clavicula-extras
```

## Decorators

### withPersist

Syncs store state with localStorage.

```javascript
import { createStore } from '@grimoire-intel/clavicula';
import { withPersist, withBatching } from '@grimoire-intel/clavicula-extras';

// Always wrap with withBatching to avoid excessive writes
const settings = withPersist(
  withBatching(createStore({ theme: 'light' })),
  'app-settings'
);
```

### withBatching

Batches multiple synchronous updates into a single notification. Includes built-in equality checking.

```javascript
import { withBatching } from '@grimoire-intel/clavicula-extras';

const store = withBatching(createStore({ x: 0, y: 0 }));

// These three calls result in one notification
store.set({ x: 1 });
store.set({ y: 2 });
store.set({ x: 10 });
// Subscribers see: { x: 10, y: 2 }
```

### withHistory

Adds undo/redo capability.

```javascript
import { withHistory } from '@grimoire-intel/clavicula-extras';

const store = withHistory(createStore({ text: '' }));

store.set({ text: 'hello' });
store.set({ text: 'hello world' });

store.undo(); // { text: 'hello' }
store.redo(); // { text: 'hello world' }

store.canUndo(); // true
store.canRedo(); // false
```

### withReset

Adds a reset method to restore initial state.

```javascript
import { withReset } from '@grimoire-intel/clavicula-extras';

const store = withReset(createStore({ count: 0 }));

store.set({ count: 99 });
store.reset(); // { count: 0 }
```

### withFreeze

Deep freezes state after every update to catch accidental mutations. No-op in production.

```javascript
import { withFreeze } from '@grimoire-intel/clavicula-extras';

const store = withFreeze(createStore({ items: [] }));

store.get().items.push('oops'); // Throws in development
```

### withLogging

Logs state changes to console.

```javascript
import { withLogging } from '@grimoire-intel/clavicula-extras';

const store = withLogging(createStore({ count: 0 }), 'counter');
// Logs: [counter] { count: 0 }

store.set({ count: 1 });
// Logs: [counter] { count: 1 }
```

## Composition Order

Decorators that use `subscribe()` internally must be outermost:

```javascript
// Correct order
withPersist(
  withBatching(
    withHistory(
      withFreeze(store)
    )
  ),
  'key'
)
```

See [Writing Decorators](https://github.com/grimoire-intelligence/clavicula/blob/main/docs/decorators.md) for details.

## API

```typescript
function withPersist<T>(store: Store<T>, key: string): Store<T>;
function withBatching<T>(store: Store<T>, isEqual?: (a: T, b: T) => boolean): Store<T>;
function withHistory<T>(store: Store<T>, maxSize?: number): HistoryStore<T>;
function withReset<T>(store: Store<T>): Store<T> & { reset(): void };
function withFreeze<T>(store: Store<T>): Store<T>;
function withLogging<T>(store: Store<T>, label?: string): Store<T>;
```

See the [main documentation](https://github.com/grimoire-intelligence/clavicula) for full API reference.
