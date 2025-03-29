export type GetDataHandleFn = (err: null | {
    message: string;
    stack?: string;
}, data?: unknown) => void;
export interface GetDataHandle extends GetDataHandleFn {
    timeout?: number | null | NodeJS.Timeout;
}
export interface ProxyCallback {
    __msg2call_cbname__: string;
    releaseProxy: () => void;
}
export type Events = Map<string, GetDataHandle>;
export interface RemoteGroup {
    handling: boolean;
    options: {
        timeout?: number;
        queue?: boolean;
    };
    queue: Array<[() => void, (error: Error) => void]>;
}
export declare enum CALL_TYPES {
    REQUEST = 0,
    RESPONSE = 1,
    CALLBACK_REQUEST = 2,
    CALLBACK_RESPONSE = 3
}
export type SendMessage = (type: CALL_TYPES, name: string, errorMessage?: string, errorStack?: string) => void;
export type ResponseMessage = [CALL_TYPES.RESPONSE | CALL_TYPES.CALLBACK_RESPONSE, string, {
    message: string;
    stack?: string;
}] | [CALL_TYPES.RESPONSE | CALL_TYPES.CALLBACK_RESPONSE, string, null, unknown];
export type RequestMessage = [CALL_TYPES.REQUEST, string, string[], unknown[], number[]];
export type RequestCallbackMessage = [CALL_TYPES.CALLBACK_REQUEST, string, unknown[]];
