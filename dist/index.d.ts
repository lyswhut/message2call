import type { Options } from '../types/common';
interface ProxyCallback {
    __msg2call_cbname__: string;
    releaseProxy: () => void;
}
interface RemoteGroup {
    handling: boolean;
    options: {
        timeout?: number;
        queue?: boolean;
    };
    queue: Array<[() => void, (error: Error) => void]>;
}
export declare const createMsg2call: <T>(options: Options) => {
    /**
     * remote proxy object
     */
    remote: T;
    /**
     * create remote proxy object of group calls
     */
    createRemoteGroup<T_1>(groupName: string, options?: RemoteGroup['options']): T_1;
    /**
     * on message function
     */
    message: (message: any) => void;
    /**
     * destroy
     */
    destroy: () => void;
};
/**
 * create a proxy callback
 */
export declare const createProxyCallback: <T extends Function>(callback: T) => T & Pick<ProxyCallback, "releaseProxy">;
/**
 * release all created proxy callback
 */
export declare const releaseAllProxyCallback: () => void;
export type * from '../types/common';
