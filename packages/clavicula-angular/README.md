# @grimoire-intel/clavicula-angular

Angular adapter for [Clavicula](https://github.com/grimoire-intelligence/clavicula).

## Installation

```bash
npm install @grimoire-intel/clavicula @grimoire-intel/clavicula-angular
```

## Usage

### With Observable (async pipe)

```typescript
import { Component } from '@angular/core';
import { createStore, toObservable } from '@grimoire-intel/clavicula-angular';

const counterStore = createStore({ count: 0 });

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="increment()">
      Count: {{ (state$ | async)?.count }}
    </button>
  `
})
export class CounterComponent {
  state$ = toObservable(counterStore);

  increment() {
    counterStore.set(s => ({ count: s.count + 1 }));
  }
}
```

### With Signal (Angular 16+)

```typescript
import { Component, OnDestroy } from '@angular/core';
import { createStore, toSignal } from '@grimoire-intel/clavicula-angular';

const counterStore = createStore({ count: 0 });

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="increment()">
      Count: {{ state.signal().count }}
    </button>
  `
})
export class CounterComponent implements OnDestroy {
  state = toSignal(counterStore);

  increment() {
    counterStore.set(s => ({ count: s.count + 1 }));
  }

  ngOnDestroy() {
    this.state.destroy();
  }
}
```

## API

```typescript
function toObservable<T>(store: Store<T>): Observable<T>;
function toSignal<T>(store: Store<T>): { signal: Signal<T>; destroy: () => void };
```

See the [main documentation](https://github.com/grimoire-intelligence/clavicula) for full API reference.
