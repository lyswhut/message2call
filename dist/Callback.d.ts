import type { Options } from '../types/common';
import { type ResponseMessage, type ProxyCallback } from './shared';
export declare class Callback {
    private readonly sendResponse;
    private readonly isSendErrorStack;
    constructor(options: Options, sendResponse: (message: ResponseMessage) => void);
    handleCallbackRequest(callbackName: string, args: unknown[]): Promise<void>;
}
/**
 * create a proxy callback
 */
export declare const createProxyCallback: <T extends Function>(callback: T) => T & Pick<ProxyCallback, "releaseProxy">;
/**
 * release all created proxy callback
 */
export declare const releaseAllProxyCallback: () => void;
