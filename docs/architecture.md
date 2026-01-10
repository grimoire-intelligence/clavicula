# Clavicula Architecture

This document explains the key architectural decisions in Clavicula and their rationale.

## Design Principles

Clavicula follows three core principles that guide every decision:

### 1. Platform Before Framework

The web platform is better-documented and better-optimized than any abstraction over it. We use browser primitives rather than inventing machinery.

**Implications:**
- `EventTarget` for pub/sub instead of custom event emitters
- `CustomEvent` for event dispatch instead of proprietary event objects
- `localStorage` API directly instead of abstraction layers
- No polyfills, no compatibility layers

### 2. Composition Before Configuration

The smaller and more predictable each step, the more reliably it can be comprehended. Features emerge from combining simple parts.

**Implications:**
- No options objects on `createStore`
- No middleware system—write decorators instead
- No modes or flags that change behavior
- `withPersist` is external composition, not internal configuration

### 3. Memory Before Reasoning

An API surface must fit entirely in context. Hallucination happens when a model must guess instead of knowing.

**Implications:**
- 7 vocabulary items total
- No method overloads
- No polymorphic behaviors requiring contextual inference
- Complete API visible in a single screen

---

## Core Implementation Decisions

### Why EventTarget?

**Decision:** Use the platform's `EventTarget` class as the internal pub/sub mechanism.

**Alternatives considered:**
1. Custom event emitter class
2. RxJS Subjects
3. Callback arrays with manual management

**Rationale:**

`EventTarget` is a built-in browser primitive with decades of optimization. It:
- Has no bundle size cost (it's already in the browser)
- Is thoroughly documented on MDN
- Is visible in browser DevTools (Event Listeners panel)
- Handles edge cases (listener removal during dispatch, etc.)
- Is understood by every AI model trained on web documentation

Custom implementations would add bytes, introduce bugs, and require documentation.

**Implementation:**

```javascript
const bus = new EventTarget();
bus.addEventListener('change', handler);
bus.dispatchEvent(new CustomEvent('change', { detail: state }));
```

### Why Object.is for Derived Equality?

**Decision:** Use `Object.is(value, next)` to determine if a derived store should notify subscribers.

**Alternatives considered:**
1. Deep equality (lodash.isEqual)
2. Shallow equality (compare object keys)
3. JSON.stringify comparison
4. Always notify (no equality check)

**Rationale:**

|Approach|Pros|Cons|
|--------|----|----|
|`Object.is`|Fast O(1), no false negatives|Primitives only, objects always "change"|
|Deep equality|Catches deep object changes|Slow, requires dependency, recursive|
|Shallow equality|Catches one level|Misses nested changes, still O(n)|
|JSON.stringify|Catches most changes|Slow, non-deterministic key order|
|Always notify|Simple|Wasted renders, subscriber burden|

`Object.is` is the right tradeoff because:
- Derived values should return primitives or new object references when changed
- It's what React's `useSyncExternalStore` expects
- It pushes complexity to the derivation function (explicit is better)
- Zero dependencies, zero bundle cost

**Usage guidance:**

```javascript
// Good: Returns primitives
const count = derived(store, s => s.items.length);

// Good: New reference on change
const filtered = derived(store, s => s.items.filter(i => i.active));

// Fine: Reference will change anyway when items change
const summary = derived(store, s => ({ total: s.items.length, active: s.items.filter(i => i.active).length }));
```

### Why Decorator Pattern for Persistence?

**Decision:** `withPersist` wraps a store after creation rather than being a configuration option.

**Alternatives considered:**
1. `createStore(initial, { persist: 'key' })`
2. `createPersistedStore(initial, key)`
3. Middleware system like Redux

**Rationale:**

Options objects violate "composition before configuration":
- They create combinatorial complexity (persist + other options)
- They require conditional logic inside `createStore`
- They make the function signature harder to remember

Separate functions would work but:
- Add vocabulary items
- Duplicate store creation logic
- Make composition order unclear

The decorator pattern:
- Keeps `createStore` simple
- Makes persistence explicit and visible
- Allows stacking: `withPersist(withLogging(createStore(...)))`
- Returns the same store interface (no new API to learn)

### Why Eager Derived Evaluation?

**Decision:** Derived stores compute their value immediately and keep it updated.

**Alternatives considered:**
1. Lazy evaluation (compute on `get()`)
2. Pull-based reactivity (only compute when subscribed)

**Rationale:**

Lazy evaluation is more efficient when derived values aren't read often. But:
- It requires tracking whether the value is "stale"
- It complicates the mental model (is this value current?)
- It can cause computation during render (React anti-pattern)

Eager evaluation:
- Guarantees `get()` always returns the current value
- Makes timing predictable (compute happens after source `set()`)
- Keeps the derived store simple (no staleness flags)

The tradeoff is slightly more computation. For most applications, derived functions are cheap (filtering, mapping, property access). If computation is expensive, the user should memoize the derivation function.

### Why No Selector System?

**Decision:** No built-in selector memoization or equality functions.

**Alternatives considered:**
1. Zustand-style `(state) => state.slice` with auto-memoization
2. Reselect-style composed selectors
3. Equality function parameter: `subscribe(fn, isEqual)`

**Rationale:**

Selector systems add significant complexity:
- Memoization cache management
- Reference equality vs value equality decisions
- Framework-specific optimizations

Clavicula's answer is simpler: use `derived` for computed slices.

```javascript
// Instead of selector memoization:
const userCount = derived(store, s => s.users.length);
const users = useStore(userCount); // Only re-renders when count changes
```

This pushes complexity to where it's explicit and debuggable.

---

## Performance Characteristics

### Bundle Size

| Component | Size (minified + gzipped) |
|-----------|---------------------------|
| Core (`createStore`, `derived`, `withPersist`) | ~600 bytes |
| React adapter | ~100 bytes |
| Vue adapter | ~120 bytes |
| Solid adapter | ~90 bytes |
| Angular adapter | ~150 bytes |

Total core + one adapter: **~700 bytes**

For comparison:
- Zustand: ~2KB
- Redux + Redux Toolkit: ~12KB
- MobX: ~15KB

### Runtime Performance

**Store operations:**
- `get()`: O(1) - direct property access
- `set()`: O(n) where n = subscriber count
- `subscribe()`: O(1) - Set.add()
- Unsubscribe: O(1) - Set.delete()

**Derived operations:**
- `get()`: O(1) - cached value
- Recomputation: O(n) sources + O(derivation fn)
- Subscription propagation: O(n) listeners

**Memory:**
- Store: ~200 bytes overhead + state size
- Derived: ~300 bytes overhead + cached value size
- Subscriber: ~50 bytes per callback

### Scaling Considerations

**Recommended maximums:**
- Subscribers per store: 1000 (EventTarget handles well)
- Derived chain depth: 5-10 (beyond this, consider flattening)
- State object properties: No limit (plain object)

**Patterns that scale:**
- Multiple stores for different domains
- Shallow derived chains
- Coarse-grained subscriptions (component-level, not element-level)

**Anti-patterns:**
- Single massive store with deep nesting
- Derived-of-derived-of-derived chains
- Per-element subscriptions in large lists

---

## Security Considerations

### localStorage Persistence

`withPersist` stores state as JSON in localStorage. Considerations:

- **No encryption**: Don't persist sensitive data (tokens, PII)
- **Quota limits**: localStorage has ~5MB limit per origin
- **XSS exposure**: Any XSS can read localStorage
- **Synchronous API**: Large state can block main thread

For sensitive data, use:
- Session-only state (no persistence)
- Server-side sessions with secure cookies
- Encrypted storage with user-managed keys

### State Validation

`withPersist` trusts localStorage content. Malformed data is caught by try/catch, but valid-but-wrong data will be loaded. For production:

```javascript
function withValidatedPersist(store, key, validate) {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (validate(parsed)) {
        store.set(parsed);
      }
    } catch (e) {
      console.warn(`Invalid persisted state for "${key}"`);
    }
  }
  store.subscribe(state => localStorage.setItem(key, JSON.stringify(state)));
  return store;
}
```

---

## Comparison with Other Architectures

### vs. Flux/Redux Architecture

Redux uses unidirectional data flow: Actions -> Reducers -> Store -> View.

Clavicula is simpler: `set()` -> Store -> Subscribers.

The Redux pattern is valuable for:
- Large teams needing enforced conventions
- Time-travel debugging requirements
- Complex state machines

Clavicula trades those features for:
- Smaller learning curve
- Less boilerplate
- Direct mutations without action creators

### vs. Proxy-based Reactivity (MobX, Valtio)

Proxy-based stores intercept property access for automatic dependency tracking.

Clavicula requires explicit subscriptions.

Proxies are valuable for:
- Fine-grained reactivity without selectors
- Mutable APIs that feel like plain objects

Clavicula trades those features for:
- Predictable behavior (no magic)
- Better debugging (explicit subscriptions)
- Smaller bundle (no Proxy wrappers)

### vs. Signals (Solid, Preact, Angular)

Signals are primitives where reading creates dependencies automatically.

Clavicula's `derived` is similar but requires explicit dependency declaration.

Signals are valuable for:
- Fine-grained updates without re-renders
- Compiler optimizations

Clavicula works with signals (via adapters) while providing a framework-agnostic core.

---

## Future Considerations

### Potential Extensions (as separate packages)

1. **withHistory** - Undo/redo decorator
2. **withMiddleware** - Intercept sets for logging/validation
3. **createAtom** - Single-value store for primitives
4. **broadcast** - Cross-tab synchronization

Each would follow the decorator pattern, keeping the core minimal.

### What We Won't Add

- Built-in devtools (use browser Event Listeners panel)
- Immer integration (spread syntax is sufficient)
- Async actions (call `set` when promise resolves)
- React-specific hooks (adapters handle this)

The core will remain ~60 lines of code.
