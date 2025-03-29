import type { Options as CommonOpts } from '../types/common';
import { type ResponseMessage, type RequestCallbackMessage, type Events } from './shared';
export interface Options {
    proxyObj: CommonOpts['proxyObj'];
    onCallBeforeParams: CommonOpts['onCallBeforeParams'];
    events: Events;
    isSendErrorStack: boolean;
    timeout: number;
}
export declare class Local {
    private readonly events;
    private readonly proxyObj;
    private readonly sendResponse;
    private readonly timeout;
    private readonly onCallBeforeParams;
    private readonly isSendErrorStack;
    constructor({ proxyObj, events, timeout, onCallBeforeParams, isSendErrorStack }: Options, sendResponse: (message: ResponseMessage | RequestCallbackMessage) => void);
    private handleCallbackData;
    handleRequest(eventName: string, path: string[], args: unknown[], callbacks: number[]): Promise<void>;
}
