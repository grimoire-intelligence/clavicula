# Writing Decorators

Decorators are composable wrappers that extend store functionality without modifying the core. This document explains how to write your own.

## The Store Interface

A valid store implements three methods:

```typescript
interface Store<T> {
  get(): T;
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
}
```

**Contract requirements:**
- `get()` returns current state
- `set()` merges partial state and notifies subscribers
- `subscribe()` calls the listener immediately with current state, then on each change
- `subscribe()` returns an unsubscribe function

Any object satisfying this interface works with framework adapters and other decorators.

## Decorator Patterns

### Pattern 1: Side Effect (Pass-through)

Add behavior without changing the store interface. Return the same store instance.

```javascript
function withLogging(store, label = 'store') {
  store.subscribe(state => console.log(`[${label}]`, state));
  return store;  // Same instance
}
```

Use when:
- Adding observers (logging, persistence, analytics)
- No need to intercept or modify operations

Examples: `withLogging`, `withPersist`

### Pattern 2: Wrapper

Intercept operations by returning a new object that delegates to the original.

```javascript
function withDistinct(store, isEqual = shallowEqual) {
  return {
    get: store.get,          // Delegate directly
    subscribe: store.subscribe,
    set(partial) {           // Intercept and conditionally delegate
      const current = store.get();
      const next = typeof partial === 'function'
        ? { ...current, ...partial(current) }
        : { ...current, ...partial };
      if (!isEqual(current, next)) {
        store.set(partial);
      }
    }
  };
}
```

Use when:
- Intercepting `set()` to transform, validate, or block updates
- Intercepting `get()` to transform returned state
- Intercepting `subscribe()` to filter or batch notifications

Examples: `withDistinct`, `withFreeze`, `withBatching`

### Pattern 3: Extended

Add new methods while preserving the base interface.

```javascript
function withReset(store) {
  const initial = { ...store.get() };
  return {
    get: store.get,
    set: store.set,
    subscribe: store.subscribe,
    reset: () => store.set(initial)  // New method
  };
}
```

Use when:
- Adding capabilities like `reset()`, `undo()`, `redo()`
- The base store operations remain unchanged

Examples: `withReset`, `withHistory`

## Guidelines

### Preserve the Subscribe Contract

The subscribe contract requires calling the listener immediately:

```javascript
// WRONG: Breaks contract
subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// RIGHT: Immediate call
subscribe(fn) {
  listeners.add(fn);
  fn(this.get());  // Call immediately with current state
  return () => listeners.delete(fn);
}
```

Framework adapters depend on this. Breaking it causes bugs.

### Support Function Partials

`set()` accepts both objects and functions. Handle both:

```javascript
set(partial) {
  const current = store.get();
  const update = typeof partial === 'function'
    ? partial(current)
    : partial;
  // ... use update
}
```

### Composition Order Matters

Decorators wrap in layers—outer decorators intercept calls first, inner decorators are closest to the real store. Order changes behavior:

**`withDistinct(withBatching(store))`:**
- Each `set()` hits withDistinct first
- Equality check on every individual call
- Only differing updates reach withBatching

**`withBatching(withDistinct(store))`:**
- All `set()` calls queue in withBatching
- After microtask, one merged update hits withDistinct
- Single equality check for the whole batch (more efficient)

**Recommended order (outermost → innermost):**

1. **Batching** (`withBatching`) — Collect updates before anything else
2. **Filtering** (`withDistinct`) — Check the batched result once
3. **History** (`withHistory`) — Track meaningful state changes
4. **Validation/Transform** (`withFreeze`) — Process final state
5. **Side effects** (`withLogging`, `withPersist`) — Observe final state

```javascript
withBatching(
  withDistinct(
    withHistory(
      withFreeze(
        withLogging(store, 'myStore')
      )
    )
  )
)
```

**Why this order:**
- Batching first = fewer downstream operations
- Distinct after batching = one check per batch, not per call
- History after filtering = only track meaningful changes
- Side effects last = they see the actual stored state

### withPersist Requires Protection

`withPersist` writes to localStorage on **every** state change. This is a footgun for:
- Rapidly changing state (e.g., drag position, form input)
- Large objects (localStorage is synchronous, blocks main thread)

**Always wrap with batching and distinct first:**

```javascript
// WRONG: Writes to localStorage on every keystroke
const formStore = withPersist(createStore({ text: '' }), 'form');

// RIGHT: Batches and dedupes before persisting
const formStore = withPersist(
  withBatching(
    withDistinct(createStore({ text: '' }))
  ),
  'form'
);
```

Note: `withPersist` must be **outermost** because it uses `subscribe()` internally. If placed inside other wrappers, it subscribes to the inner store directly, bypassing batching/distinct.

### Keep It Minimal

Each decorator should do one thing. If you're adding multiple features, split them:

```javascript
// WRONG: Does too much
function withEverything(store) { ... }

// RIGHT: Compose single-purpose decorators
withHistory(withFreeze(withDistinct(store)))
```

### Handle Edge Cases

Consider SSR/Node environments:

```javascript
function withPersist(store, key) {
  if (typeof localStorage === 'undefined') return store;
  // ... browser-only logic
}
```

Consider cleanup:

```javascript
function withSomeFeature(store) {
  const interval = setInterval(...);
  return {
    ...store,
    destroy() { clearInterval(interval); }
  };
}
```

## Example: Custom Decorator

Here's a complete example of a throttled store:

```javascript
/**
 * Throttles set() calls to at most one per `ms` milliseconds.
 * @param {Store} store - The store to wrap
 * @param {number} ms - Minimum milliseconds between updates
 * @returns {Store} Throttled store
 */
export function withThrottle(store, ms) {
  let lastSet = 0;
  let pending = null;
  let timeoutId = null;

  return {
    get: store.get,
    subscribe: store.subscribe,

    set(partial) {
      const now = Date.now();
      pending = partial;

      if (now - lastSet >= ms) {
        lastSet = now;
        store.set(pending);
        pending = null;
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastSet = Date.now();
          store.set(pending);
          pending = null;
          timeoutId = null;
        }, ms - (now - lastSet));
      }
    }
  };
}
```

## TypeScript

For TypeScript users, decorators should preserve generic types:

```typescript
function withReset<T extends object>(store: Store<T>): Store<T> & { reset(): void } {
  const initial = { ...store.get() };
  return {
    get: store.get,
    set: store.set,
    subscribe: store.subscribe,
    reset: () => store.set(initial as T)
  };
}
```

Extended stores can define their own interfaces:

```typescript
interface HistoryStore<T> extends Store<T> {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

function withHistory<T extends object>(store: Store<T>): HistoryStore<T> {
  // ...
}
```
