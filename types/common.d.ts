export declare type ReadObj = Record<string, ((...args: unknown[]) => unknown) | string | number | object>

export declare interface Options {
  /**
   * required proxy object
   */
  proxyObj: Readonly<ReadObj>
  /**
   * send message function
   */
  sendMessage: (data: unknown) => void
  /**
   * on call error hook
   */
  onError?: (err: Error, path: string[], groupName: string | null) => viod
  /**
   * call timeout, 0 will be no timeout
   */
  timeout?: number
  /**
   * whether the call fails to send the call stack
   */
  isSendErrorStack?: boolean
  /**
   * convert call params
   */
  onCallBeforeParams?: (rawArgs: unknown[]) => unknown[]
}
