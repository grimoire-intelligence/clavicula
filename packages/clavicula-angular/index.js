import { Observable } from 'rxjs';
import { signal } from '@angular/core';

/**
 * Converts a Clavicula store to an RxJS Observable.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @returns {Observable<T>} Observable that emits on store changes
 * @template T
 */
export function toObservable(store) {
  return new Observable(subscriber => {
    subscriber.next(store.get());
    return store.subscribe(val => subscriber.next(val));
  });
}

/**
 * Converts a Clavicula store to an Angular Signal.
 * @param {import('clavicula').Store<T> | import('clavicula').DerivedStore<T>} store
 * @returns {{ signal: import('@angular/core').Signal<T>, destroy: () => void }}
 * @template T
 */
export function toSignal(store) {
  const sig = signal(store.get());
  const unsub = store.subscribe(val => sig.set(val));
  return { signal: sig.asReadonly(), destroy: unsub };
}
