import type { Options, ReadObj } from '../types/common'
import { nextTick } from './utils'

type FuncsTools = typeof funcsTools
// type EventHandlers = Array<(data?: any) => (void | Promise<void>)>
type GetDataHandleFn = (err: null | { message: string, stack?: string }, data?: any) => void
interface GetDataHandle extends GetDataHandleFn {
  timeout?: number | null
}
interface ProxyCallback {
  __msg2call_cbname__: string
  releaseProxy: () => void
}
type Events = Map<string, GetDataHandle>

interface RemoteGroup {
  handling: boolean
  options: { timeout?: number, queue?: boolean }
  queue: Array<[() => void, (error: Error) => void]>
}

enum CALL_TYPES {
  REQUEST,
  RESPONSE,
  CALLBACK_REQUEST,
  CALLBACK_RESPONSE,
}

const proxyCallbacks = new Map<string, Function & ProxyCallback>()
const emptyObj = {}
const noop = () => {}
const funcsTools = {
  funcsObj: emptyObj as ReadObj,
  events: emptyObj as Events,
  remoteGroups: emptyObj as Map<string, RemoteGroup>,
  sendMessage: noop as (data: any) => void,
  onError: noop as NonNullable<Options['onError']>,
  onCallBeforeParams: undefined as Options['onCallBeforeParams'],
  timeout: 120 * 1000,
  isSendErrorStack: false,

  init<T>(options: Options) {
    this.funcsObj = options.funcsObj
    this.events = new Map()
    this.remoteGroups = new Map()
    this.sendMessage = options.sendMessage
    if (options.timeout != null) this.timeout = options.timeout
    if (options.isSendErrorStack != null) this.isSendErrorStack = options.isSendErrorStack
    if (options.onError != null) this.onError = options.onError
    if (options.onCallBeforeParams != null) this.onCallBeforeParams = options.onCallBeforeParams
    return this.createProxy<T>(this, null)
  },
  async handleCallbackRequest(callbackName: string, args: any[]) {
    const handler = proxyCallbacks.get(callbackName)
    if (!handler) {
      this.sendMessage({
        type: CALL_TYPES.CALLBACK_RESPONSE,
        name: callbackName,
        error: { message: `${callbackName} is released` },
      })
      return
    }
    let result: any
    try {
      result = await handler(...args)
    } catch (err: any) {
      this.sendMessage({
        type: CALL_TYPES.CALLBACK_RESPONSE,
        name: callbackName,
        error: { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
      })
      return
    }
    this.sendMessage({
      type: CALL_TYPES.RESPONSE,
      name: callbackName,
      error: null,
      data: result,
    })
  },
  async handleCallbackData(callbackName: string, timeout: number, args: any[]) {
    return new Promise((resolve, reject) => {
      const handler = ((err: null | { message: string, stack?: string }, data?: any) => {
        if (handler.timeout) clearTimeout(handler.timeout)
        this.events.delete(callbackName)
        if (err == null) resolve(data)
        else {
          const error = new Error(err.message)
          error.stack = err.stack
          reject(error)
        }
      }) as GetDataHandle
      this.events.set(callbackName, handler)

      if (timeout) {
        handler.timeout = setTimeout(() => {
          handler.timeout = null
          handler({ message: 'call remote timeout' })
        }, timeout) as unknown as number
      }
      this.sendMessage({
        type: CALL_TYPES.CALLBACK_REQUEST,
        name: callbackName,
        args,
      })
    })
  },
  async handleRequest(eventName: string, path: string[], args: any[], callbacks: number[]) {
    let obj = this.funcsObj as any
    const name = path.pop() as string
    for (const _name of path) {
      obj = obj[_name]
      if (obj === undefined) {
        this.sendMessage({
          type: CALL_TYPES.RESPONSE,
          name: eventName,
          error: { message: `${name} is not defined` },
        })
        return
      }
    }
    if (typeof obj[name] == 'function') {
      let result: any
      if (callbacks.length) {
        for (const index of callbacks) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const context = this
          const name = args[index]
          args.splice(index, 1, async function(...args: any[]) {
            return context.handleCallbackData(name, context.timeout, args)
          })
        }
      }
      // console.log('args: ', args)
      try {
        if (this.onCallBeforeParams) args = this.onCallBeforeParams(args)
        result = await obj[name].apply(obj, args)
      } catch (err: any) {
        this.sendMessage({
          type: CALL_TYPES.RESPONSE,
          name: eventName,
          error: { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
        })
        return
      }
      this.sendMessage({
        type: CALL_TYPES.RESPONSE,
        name: eventName,
        error: null,
        data: result,
      })
    } else if (obj[name] === undefined) {
      this.sendMessage({
        type: CALL_TYPES.RESPONSE,
        name: eventName,
        error: { message: `${name} is not defined` },
      })
    } else {
      this.sendMessage({
        type: CALL_TYPES.RESPONSE,
        name: eventName,
        error: null,
        data: obj[name],
      })
    }
  },
  handleGroupNextTask(groupName: string, error?: Error) {
    nextTick(() => {
      const group = (this.remoteGroups.get(groupName) as RemoteGroup)
      group.handling = false
      if (group.queue.length) {
        if (error == null) {
          (group.queue.shift() as RemoteGroup['queue'][number])[0]()
        } else {
          (group.queue.shift() as RemoteGroup['queue'][number])[1](error)
        }
      }
    })
  },
  async waitQueue(group: RemoteGroup, groupName: string, pathname: string[]) {
    if (group.handling) {
      await new Promise<void>((resolve, reject) => {
        group.queue.push([resolve, (error: Error) => {
          reject(error)
          this.onError(error, pathname, groupName)
          this.handleGroupNextTask(groupName, error)
        }])
      })
    }
    group.handling = true
  },
  async handleData(groupName: string | null, pathname: string[], timeout: number, args: any[]) {
    const eventName = `${pathname.join('.')}__${String(Math.random()).substring(2)}`
    return new Promise((resolve, reject) => {
      const handler = ((err: null | { message: string, stack?: string }, data?: any) => {
        if (handler.timeout) clearTimeout(handler.timeout)
        this.events.delete(eventName)
        if (err == null) resolve(data)
        else {
          const error = new Error(err.message)
          error.stack = err.stack
          this.onError(error, pathname, groupName)
          reject(error)
        }
      }) as GetDataHandle
      const callbacks: number[] = []
      args = args.map((arg, index) => {
        if (typeof arg === 'function') {
          if (!arg.__msg2call_cbname__) throw new Error('callback is not a proxy callback')
          callbacks.push(index)
          return arg.__msg2call_cbname__
        }
        return arg
      })
      this.events.set(eventName, handler)

      if (timeout) {
        handler.timeout = setTimeout(() => {
          handler.timeout = null
          handler({ message: 'call remote timeout' })
        }, timeout) as unknown as number
      }
      this.sendMessage({
        type: CALL_TYPES.REQUEST,
        name: eventName,
        path: pathname,
        args,
        cbs: callbacks,
      })
    })
  },
  async getData(groupName: string | null, pathname: string[], args: any[]) {
    // console.log(groupName, pathname, data)
    let timeout = this.timeout
    let isQueue = false
    if (groupName != null) {
      let group = this.remoteGroups.get(groupName) as RemoteGroup
      if (group.options.timeout != null) timeout = group.options.timeout
      if (group.options.queue) {
        isQueue = true
        await this.waitQueue(group, groupName, pathname)
      }
    }
    let promise = this.handleData(groupName, pathname, timeout, args)
    if (isQueue) {
      promise = promise.then((data) => {
        this.handleGroupNextTask(groupName!)
        return data
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      }).catch((error) => {
        this.handleGroupNextTask(groupName!, error)
        return Promise.reject(error)
      })
    }
    return promise
  },
  async handleResponse(name: string, err: { message: string, stack?: string } | null, data?: any) {
    const handler = this.events.get(name)
    // if (handler) {
    if (typeof handler == 'function') handler(err, data)
    // else if (Array.isArray(handler)) {
    //   for (const h of handler) await h(data)
    // }
    // }
  },
  createProxy<T>(context: typeof this, groupName: string | null, path: string[] = []) {
    const proxy = new Proxy(function() {}, {
      get: (_target, prop, receiver) => {
        let propName = prop.toString()
        // console.log('get prop name', propName, path)
        if (prop == 'then' && path.length) {
          const r = context.getData(groupName, path, [])
          return r.then.bind(r)
        }
        return context.createProxy(context, groupName, [...path, propName])
      },
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      apply: (target, thisArg, argumentsList) => {
        return context.getData(groupName, path, argumentsList)
      },

      // deleteProperty
    }) as T

    return proxy
  },
  onMessage(message: any) {
    switch (message.type) {
      case CALL_TYPES.REQUEST:
        void this.handleRequest(message.name, message.path, message.args, message.cbs)
        break
      case CALL_TYPES.CALLBACK_REQUEST:
        void this.handleCallbackRequest(message.name, message.args)
        break
      case CALL_TYPES.RESPONSE:
      case CALL_TYPES.CALLBACK_RESPONSE:
        void this.handleResponse(message.name, message.error, message.data)
        break
    }
  },
  onDestroy() {
    for (const handler of this.events.values()) {
      handler({ message: 'destroy' })
    }
  },
}

export const createMsg2call = <T>(options: Options) => {
  const tools = Object.create(funcsTools) as FuncsTools
  return {
    /**
     * remote proxy object
     */
    remote: tools.init<T>(options),
    /**
     * create remote proxy object of group calls
     */
    createRemoteGroup<T>(groupName: string, options: RemoteGroup['options'] = {}) {
      tools.remoteGroups.set(groupName, { handling: false, queue: [], options })
      return tools.createProxy<T>(tools, groupName)
    },
    /**
     * on message function
     */
    message: tools.onMessage.bind(tools),
    /**
     * destroy
     */
    destroy: tools.onDestroy.bind(tools),
  }
}

/**
 * create a proxy callback
 */
export const createProxyCallback = <T extends Function>(callback: T) => {
  const name = (callback as T & ProxyCallback).__msg2call_cbname__ = `func_${proxyCallbacks.size}_${String(Math.random()).substring(2, 10)}`
  proxyCallbacks.set(name, callback as T & ProxyCallback)
  ;(callback as T & ProxyCallback).releaseProxy = () => {
    proxyCallbacks.delete(name)
  }
  return callback as T & Pick<ProxyCallback, 'releaseProxy'>
}

/**
 * release all created proxy callback
 */
export const releaseAllProxyCallback = () => {
  proxyCallbacks.clear()
}


export type * from '../types/common'
