import type { Options, ReadObj } from '../types/common'
import { nextTick } from './utils'

type FuncsTools = typeof funcsTools
// type EventHandlers = Array<(data?: any) => (void | Promise<void>)>
type GetDataHandleFn = (err: null | string, data?: any) => void
interface GetDataHandle extends GetDataHandleFn {
  timeout?: number | null
}
type Events = Map<string, GetDataHandle>

interface RemoteGroup {
  handling: boolean
  options: { timeout?: number, queue?: boolean }
  queue: Array<[() => void, (error: Error) => void]>
}

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
  async handleResponseData(eventName: string, path: string[], args: any[]) {
    let obj = this.funcsObj as any
    const name = path.pop() as string
    for (const _name of path) {
      obj = obj[_name]
      if (obj === undefined) {
        this.sendMessage({
          name: eventName,
          error: { message: `${name} is not defined` },
        })
        return
      }
    }
    if (typeof obj[name] == 'function') {
      let result: any
      // console.log('args: ', args)
      try {
        if (this.onCallBeforeParams) args = this.onCallBeforeParams(args)
        result = await obj[name].apply(obj, args)
      } catch (err: any) {
        this.sendMessage({
          name: eventName,
          error: { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
        })
        return
      }
      this.sendMessage({
        name: eventName,
        error: null,
        data: result,
      })
    } else if (obj[name] === undefined) {
      this.sendMessage({
        name: eventName,
        error: { message: `${name} is not defined` },
      })
    } else {
      this.sendMessage({
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
  async handleData(groupName: string | null, pathname: string[], timeout: number, data?: any) {
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
      this.events.set(eventName, handler)

      if (timeout) {
        handler.timeout = setTimeout(() => {
          handler.timeout = null
          handler('timeout')
        }, timeout) as unknown as number
      }
      this.sendMessage({
        name: eventName,
        path: pathname,
        data,
      })
    })
  },
  async getData(groupName: string | null, pathname: string[], data?: any) {
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
    let promise = this.handleData(groupName, pathname, timeout, data)
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
  async handleGetData(name: string, err: string | null, data?: any) {
    const handler = this.events.get(name)
    if (handler) {
      if (typeof handler == 'function') handler(err, data)
      // else if (Array.isArray(handler)) {
      //   for (const h of handler) await h(data)
      // }
    }
  },
  createProxy<T>(context: typeof this, groupName: string | null, path: string[] = []) {
    const proxy = new Proxy(function() {}, {
      get: (_target, prop, receiver) => {
        let propName = prop.toString()
        // console.log('get prop name', propName, path)
        if (prop == 'then' && path.length) {
          const r = context.getData(groupName, path)
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
  onMessage({ name, path, error, data }: any) {
    if (name) {
      if (path?.length) void this.handleResponseData(name, path, data)
      else void this.handleGetData(name, error, data)
    }
  },
  onDestroy() {
    for (const handler of this.events.values()) {
      handler('destroy')
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

export type * from '../types/common'
