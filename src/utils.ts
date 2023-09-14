
export const nextTick =
  typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
      ? queueMicrotask
      : setTimeout
