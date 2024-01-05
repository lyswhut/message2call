export declare type ReadObj = Record<string, ((...args: any[]) => any) | string | number | object>

export declare interface Options {
  /**
   * required proxy object
   */
  funcsObj: Readonly<ReadObj>
  /**
   * send message function
   */
  sendMessage: (data: Record<string, unknown>) => void
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
  onCallBeforeParams?: (rawArgs: any[]) => any[]
}
