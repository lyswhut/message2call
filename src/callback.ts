/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { Options } from '../types/common'
import { CALL_TYPES, type ResponseMessage, type ProxyCallback } from './shared'
import { generateId } from './utils'

const proxyCallbacks = new Map<string, Function & ProxyCallback>()

export class Callback {
  private readonly sendResponse: (message: ResponseMessage) => void
  private readonly isSendErrorStack: boolean

  constructor(options: Options, sendResponse: (message: ResponseMessage) => void) {
    this.sendResponse = sendResponse
    this.isSendErrorStack = options.isSendErrorStack ?? false
  }

  async handleCallbackRequest(callbackName: string, args: unknown[]) {
    const handler = proxyCallbacks.get(callbackName)
    if (!handler) {
      this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, { message: `${callbackName} is released` }])
      return
    }
    let result: unknown
    try {
      result = await handler(...args)
    } catch (err) {
      this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, { 
        message: (err as Error).message, 
        stack: this.isSendErrorStack ? (err as Error).stack : undefined,
       }])
      return
    }
    this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, null, result])
  }
}

/**
 * create a proxy callback
 */
export const createProxyCallback = <T extends Function>(callback: T) => {
  const name = (callback as T & ProxyCallback).__msg2call_cbname__ = `func_${proxyCallbacks.size}_${generateId()}`
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
