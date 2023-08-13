
export const nextTick =
  typeof setImmediate == 'function'
    ? setImmediate
    : typeof window.queueMicrotask == 'function'
      ? window.queueMicrotask
      : setTimeout
