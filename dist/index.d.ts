import type { Options } from '../types/common';
export declare const createMsg2call: <T>(options: Options) => {
    /**
     * remote proxy object
     */
    remote: T;
    /**
     * create remote proxy object of synchronous calls
     */
    createSyncRemote<T_1>(groupName: string): T_1;
    /**
     * on message function
     */
    onMessage: ({ name, path, error, data }: any) => void;
    /**
     * destroy
     */
    onDestroy: () => void;
};
export type * from '../types/common';
