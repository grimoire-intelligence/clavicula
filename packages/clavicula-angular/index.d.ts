import type { Store, DerivedStore } from 'clavicula';
import type { Observable } from 'rxjs';
import type { Signal } from '@angular/core';

/**
 * Converts a Clavicula store to an RxJS Observable.
 * Emits current value immediately, then on each change.
 */
export function toObservable<T extends object>(store: Store<T>): Observable<T>;
export function toObservable<T>(store: DerivedStore<T>): Observable<T>;

/**
 * Converts a Clavicula store to an Angular Signal.
 * Returns the signal and a destroy function to clean up subscriptions.
 */
export function toSignal<T extends object>(store: Store<T>): { signal: Signal<T>; destroy: () => void };
export function toSignal<T>(store: DerivedStore<T>): { signal: Signal<T>; destroy: () => void };
