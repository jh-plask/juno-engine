type AttemptSuccess<T> = readonly [null, T];
type AttemptFailure<E> = readonly [E, null];
type AttemptResult<E, T> = AttemptSuccess<T> | AttemptFailure<E>;
type AttemptResultAsync<E, T> = Promise<AttemptResult<E, T>>;

export type { AttemptResult, AttemptResultAsync };

export function attempt<E = Error, T = unknown>(
  operation: Promise<T>,
): AttemptResultAsync<E, T>;
export function attempt<E = Error, T = unknown>(
  operation: () => T,
): AttemptResult<E, T>;
export function attempt<E = Error, T = unknown>(
  operation: Promise<T> | (() => T),
): AttemptResult<E, T> | AttemptResultAsync<E, T> {
  if (operation instanceof Promise) {
    return operation
      .then((value) => [null, value] as const)
      .catch((error) => [error as E, null] as const);
  }

  try {
    const data = operation();
    return [null, data];
  } catch (error) {
    return [error as E, null];
  }
}
