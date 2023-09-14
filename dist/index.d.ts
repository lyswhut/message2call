import type { Options } from '../types/common';
export declare const createMsg2call: <T>(options: Options) => {
    /**
     * remote proxy object
     */
    remote: T;
    /**
     * create remote proxy object of queue calls
     */
    createQueueRemote<T_1>(groupName: string): T_1;
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
