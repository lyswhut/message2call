
export const nextTick =
  typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
      ? queueMicrotask
      : (callback: () => void) => {
          void Promise.resolve().then(callback)
        }

// const perf = typeof performance !== 'undefined' ? performance : Date
// export const generateId = () => perf.now().toString(36).replace('.', '') + Math.random().toString(36).slice(2)
export const generateId = () => Math.random().toString(36).slice(2)
