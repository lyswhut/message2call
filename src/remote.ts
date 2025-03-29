import type { Options as CommonOpts } from '../types/common'
import { CALL_TYPES, type RequestMessage, type Events, type GetDataHandle, type RemoteGroup, type ProxyCallback } from './shared'
import { generateId, nextTick } from './utils'

export interface Options {
  onError: CommonOpts['onError']
  timeout: number
  events: Events
}

export class Remote {
  private readonly events: Events
  private readonly remoteGroups: Map<string, RemoteGroup>
  private readonly sendRequest: (message: RequestMessage) => void
  private readonly onError: Options['onError']
  private readonly timeout: NonNullable<Options['timeout']>

  constructor(options: Options, sendRequest: (message: RequestMessage) => void) {
    this.remoteGroups = new Map()
    this.events = options.events
    this.timeout = options.timeout
    this.onError = options.onError
    this.sendRequest = sendRequest
  }

  private handleGroupNextTask(groupName: string, error?: Error) {
    nextTick(() => {
      const group = (this.remoteGroups.get(groupName)!)
      group.handling = false
      if (group.queue.length) {
        if (error == null) {
          (group.queue.shift()!)[0]()
        } else {
          (group.queue.shift()!)[1](error)
        }
      }
    })
  }

  private async waitQueue(group: RemoteGroup, groupName: string, pathname: string[]) {
    if (group.handling) {
      await new Promise<void>((resolve, reject) => {
        group.queue.push([resolve, (error: Error) => {
          reject(error)
          this.onError?.(error, pathname, groupName)
          this.handleGroupNextTask(groupName, error)
        }])
      })
    }
    group.handling = true
  }

  private async handleData(groupName: string | null, pathname: string[], timeout: number, args: unknown[]) {
    const eventName = `${pathname.join('.')}_${generateId()}`
    return new Promise<unknown>((resolve, reject) => {
      const handler = ((err: null | { message: string, stack?: string }, data?: unknown) => {
        if (handler.timeout) clearTimeout(handler.timeout)
        this.events.delete(eventName)
        if (err == null) resolve(data)
        else {
          const error = new Error(err.message)
          error.stack = err.stack
          this.onError?.(error, pathname, groupName)
          reject(error)
        }
      }) as GetDataHandle
      const callbacks: number[] = []
      args = args.map((arg, index) => {
        if (typeof arg === 'function') {
          if (!(arg as unknown as ProxyCallback).__msg2call_cbname__) throw new Error('callback is not a proxy callback')
          callbacks.push(index)
          return (arg as unknown as ProxyCallback).__msg2call_cbname__
        }
        return arg as ProxyCallback
      })
      this.events.set(eventName, handler)

      if (timeout) {
        handler.timeout = setTimeout(() => {
          handler.timeout = null
          handler({ message: 'call remote timeout' })
        }, timeout) as unknown as number
      }
      this.sendRequest([CALL_TYPES.REQUEST, eventName, pathname, args, callbacks])
    })
  }

  private async getData(groupName: string | null, pathname: string[], args: unknown[]) {
    // console.log(groupName, pathname, data)
    let { timeout } = this
    let isQueue = false
    if (groupName != null) {
      let group = this.remoteGroups.get(groupName)!
      if (group.options.timeout != null) timeout = group.options.timeout
      if (group.options.queue) {
        isQueue = true
        await this.waitQueue(group, groupName, pathname)
      }
    }
    let promise = this.handleData(groupName, pathname, timeout, args)
    if (isQueue) {
      promise = promise.then((data: unknown) => {
        this.handleGroupNextTask(groupName!)
        return data
       
      }).catch((error: Error) => {
        this.handleGroupNextTask(groupName!, error)
        throw error
      })
    }
    return promise
  }

  createProxy<T>(context: typeof this, groupName: string | null, path: string[] = []) {
    const proxy = new Proxy(function() {}, {
      get: (_target, prop, receiver) => {
        let propName = prop.toString()
        // console.log('get prop name', propName, path)
        if (prop == 'then' && path.length) {
          const r = context.getData(groupName, path, [])
          return r.then.bind(r)
        }
        return context.createProxy<T>(context, groupName, [...path, propName])
      },
      apply: async(target, thisArg, argumentsList) => context.getData(groupName, path, argumentsList),

      // deleteProperty
    }) as T

    return proxy
  }

  /**
   * create remote proxy object of group calls
   */
  createRemoteGroup<T>(groupName: string, options: RemoteGroup['options'] = {}) {
    this.remoteGroups.set(groupName, { handling: false, queue: [], options })
    return this.createProxy<T>(this, groupName)
  }
}
