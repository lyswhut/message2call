import type { Options } from '../types/common';
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
    message: ({ name, path, error, data }: any) => void;
    /**
     * destroy
     */
    destroy: () => void;
};
export type * from '../types/common';
