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
function withValidation(store, validate) {
  return {
    get: store.get,          // Delegate directly
    subscribe: store.subscribe,
    set(partial) {           // Intercept and conditionally delegate
      const current = store.get();
      const next = typeof partial === 'function'
        ? { ...current, ...partial(current) }
        : { ...current, ...partial };
      if (validate(next)) {
        store.set(next);     // Pass computed next, not partial
      }
    }
  };
}
```

Use when:
- Intercepting `set()` to transform, validate, or block updates
- Intercepting `get()` to transform returned state
- Intercepting `subscribe()` to filter or batch notifications

Examples: `withFreeze` (dev only), `withBatching`

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

Decorators wrap in layers—outer decorators intercept calls first, inner decorators are closest to the real store. Order changes behavior.

**Key insight:** Decorators that use `subscribe()` internally (Pattern 1 side effects) must be **outermost**. They subscribe to whatever store is passed to them—if that's the raw store, they see raw updates. If that's a batched store, they see batched updates.

**Recommended order (innermost → outermost):**

1. **Validation/Transform** (`withFreeze`, dev only) — Process state immediately
2. **History** (`withHistory`) — Track changes after validation
3. **Batching** (`withBatching`) — Collect and dedupe updates
4. **Side effects** (`withLogging`, `withPersist`) — Observe processed state

```javascript
withPersist(
  withBatching(
    withHistory(
      withFreeze(store)
    )
  ),
  'myStore'
)
```

**Why this order:**
- Validation innermost = state is valid throughout the chain
- History inside batching = tracks each `set()` call (use batching to control granularity)
- Batching before side effects = subscribers see deduplicated state
- Side effects outermost = they subscribe to the fully processed store

**Note:** `withBatching` includes built-in equality checking (shallow by default). Pass a custom equality function as the second argument, or `() => false` to disable filtering.

### withPersist Requires Protection

`withPersist` writes to localStorage on **every** state change. This is a footgun for:
- Rapidly changing state (e.g., drag position, form input)
- Large objects (localStorage is synchronous, blocks main thread)

**Always wrap with batching:**

```javascript
// WRONG: Writes to localStorage on every keystroke
const formStore = withPersist(createStore({ text: '' }), 'form');

// RIGHT: Batches and dedupes before persisting
const formStore = withPersist(
  withBatching(createStore({ text: '' })),
  'form'
);
```

### Keep It Minimal

Each decorator should do one thing. If you're adding multiple features, split them:

```javascript
// WRONG: Does too much
function withEverything(store) { ... }

// RIGHT: Compose single-purpose decorators
withPersist(withBatching(withHistory(store)), 'key')
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
