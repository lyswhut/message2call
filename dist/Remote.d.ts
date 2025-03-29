import type { Options as CommonOpts } from '../types/common';
import { type RequestMessage, type Events, type RemoteGroup } from './shared';
export interface Options {
    onError: CommonOpts['onError'];
    timeout: number;
    events: Events;
}
export declare class Remote {
    private readonly events;
    private readonly remoteGroups;
    private readonly sendRequest;
    private readonly onError;
    private readonly timeout;
    constructor(options: Options, sendRequest: (message: RequestMessage) => void);
    private handleGroupNextTask;
    private waitQueue;
    private handleData;
    private getData;
    createProxy<T>(context: typeof this, groupName: string | null, path?: string[]): T;
    /**
     * create remote proxy object of group calls
     */
    createRemoteGroup<T>(groupName: string, options?: RemoteGroup['options']): T;
}
