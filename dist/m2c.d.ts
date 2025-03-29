import type { Options } from '../types/common';
export declare const createMessage2Call: <T>(options: Options) => {
    /**
     * remote proxy object
     */
    remote: T;
    /**
     * create remote proxy object of group calls
     */
    createRemoteGroup: <T_1>(groupName: string, options?: import("./shared").RemoteGroup["options"]) => T_1;
    /**
     * on message function
     */
    message: (message: unknown) => void;
    /**
     * destroy
     */
    destroy: () => void;
};
