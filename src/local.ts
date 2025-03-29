import type { Options as CommonOpts, ReadObj } from '../types/common'
import { CALL_TYPES, type ResponseMessage, type RequestCallbackMessage, type Events, type GetDataHandle } from './shared'

export interface Options {
  exposeObj: CommonOpts['exposeObj']
  onCallBeforeParams: CommonOpts['onCallBeforeParams']
  events: Events
  isSendErrorStack: boolean
  timeout: number
}

export class Local {
  private readonly events: Events
  private readonly exposeObj: ReadObj
  private readonly sendResponse: (message: ResponseMessage | RequestCallbackMessage) => void
  private readonly timeout: NonNullable<Options['timeout']>
  private readonly onCallBeforeParams: Options['onCallBeforeParams']
  private readonly isSendErrorStack: boolean

  constructor({ exposeObj, events, timeout, onCallBeforeParams, isSendErrorStack  }: Options, sendResponse: (message: ResponseMessage | RequestCallbackMessage) => void) {
    this.exposeObj = exposeObj
    this.events = events
    this.timeout = timeout
    this.onCallBeforeParams = onCallBeforeParams
    this.isSendErrorStack = isSendErrorStack
    this.sendResponse = sendResponse
  }

  private async handleCallbackData(callbackName: string, timeout: number, args: unknown[]) {
     
    return new Promise<unknown>((resolve, reject) => {
      const handler = ((err: null | { message: string, stack?: string }, data?: unknown) => {
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
        }, timeout)
      }
      this.sendResponse([CALL_TYPES.CALLBACK_REQUEST, callbackName, args])
    })
  }

  async handleRequest(eventName: string, path: string[], args: unknown[], callbacks: number[]) {
    let obj = this.exposeObj as Record<string, unknown>
    const name = path.pop()!
    for (const _name of path) {
      obj = obj[_name] as Record<string, unknown>
      if ((obj as Record<string, unknown> | undefined) === undefined) {
        this.sendResponse([CALL_TYPES.RESPONSE, eventName, { message: `${_name} is not defined` }])
        return
      }
    }
    if (typeof obj[name] == 'function') {
      let result: unknown
      if (callbacks.length) {
        for (const index of callbacks) {
          // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
          const context = this
          const name = args[index] as string
          args.splice(index, 1, async function(...args: unknown[]) {
            return context.handleCallbackData(name, context.timeout, args)
          })
        }
      }
      // console.log('args: ', args)
      try {
        if (this.onCallBeforeParams) args = this.onCallBeforeParams(args)
        result = await obj[name].apply(obj, args)
      } catch (err) {
        this.sendResponse([
          CALL_TYPES.RESPONSE,
          eventName,
          { message: (err as Error).message, stack: this.isSendErrorStack ? (err as Error).stack : undefined },
        ])
        return
      }
      this.sendResponse([
        CALL_TYPES.RESPONSE,
        eventName,
        null,
        result,
      ])
    } else if (obj[name] === undefined) {
      this.sendResponse([
        CALL_TYPES.RESPONSE,
        eventName,
        { message: `${name} is not defined` },
      ])
    } else {
      this.sendResponse([
        CALL_TYPES.RESPONSE,
        eventName,
        null,
        obj[name],
      ])
    }
  }
}
