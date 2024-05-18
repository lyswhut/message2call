
export const nextTick =
  typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
      ? queueMicrotask
      : (callback: () => void) => {
          void Promise.resolve().then(callback)
        }
