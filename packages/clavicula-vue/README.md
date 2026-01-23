# @grimoire-intel/clavicula-vue

Vue 3 adapter for [Clavicula](https://github.com/grimoire-intelligence/clavicula).

## Installation

```bash
npm install @grimoire-intel/clavicula @grimoire-intel/clavicula-vue
```

## Usage

```vue
<script setup>
import { createStore } from '@grimoire-intel/clavicula';
import { useStore } from '@grimoire-intel/clavicula-vue';

const counterStore = createStore({ count: 0 });
const state = useStore(counterStore);

function increment() {
  counterStore.set(s => ({ count: s.count + 1 }));
}
</script>

<template>
  <button @click="increment">Count: {{ state.count }}</button>
</template>
```

### With selector

```vue
<script setup>
const count = useStore(counterStore, s => s.count);
</script>

<template>
  <span>{{ count }}</span>
</template>
```

## API

```typescript
function useStore<T>(store: Store<T>): ShallowRef<T>;
function useStore<T, U>(store: Store<T>, selector: (state: T) => U): ShallowRef<U>;
```

Returns a Vue `ShallowRef` that updates when the store changes. Automatically cleans up on component unmount.

See the [main documentation](https://github.com/grimoire-intelligence/clavicula) for full API reference.
