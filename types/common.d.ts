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
   * call timeout
   */
  timeout?: number
  /**
   * convert call params
   */
  onCallBeforeParams?: (rawArgs: any[]) => any[]
}
