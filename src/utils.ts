
export const nextTick =
  typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
      ? queueMicrotask
      : (callback: () => void) => {
          void Promise.resolve().then(callback)
        }

export const generateId = () => performance.now().toString(36).replace('.', '') + Math.random().toString(36).slice(2)
