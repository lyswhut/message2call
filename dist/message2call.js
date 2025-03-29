var CALL_TYPES;
(function (CALL_TYPES) {
    CALL_TYPES[CALL_TYPES["REQUEST"] = 0] = "REQUEST";
    CALL_TYPES[CALL_TYPES["RESPONSE"] = 1] = "RESPONSE";
    CALL_TYPES[CALL_TYPES["CALLBACK_REQUEST"] = 2] = "CALLBACK_REQUEST";
    CALL_TYPES[CALL_TYPES["CALLBACK_RESPONSE"] = 3] = "CALLBACK_RESPONSE";
})(CALL_TYPES || (CALL_TYPES = {}));

const nextTick = typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
        ? queueMicrotask
        : (callback) => {
            void Promise.resolve().then(callback);
        };
// const perf = typeof performance !== 'undefined' ? performance : Date
// export const generateId = () => perf.now().toString(36).replace('.', '') + Math.random().toString(36).slice(2)
const generateId = () => Math.random().toString(36).slice(2);

const proxyCallbacks = new Map();
class Callback {
    sendResponse;
    isSendErrorStack;
    constructor(options, sendResponse) {
        this.sendResponse = sendResponse;
        this.isSendErrorStack = options.isSendErrorStack ?? false;
    }
    async handleCallbackRequest(callbackName, args) {
        const handler = proxyCallbacks.get(callbackName);
        if (!handler) {
            this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, { message: `${callbackName} is released` }]);
            return;
        }
        let result;
        try {
            result = await handler(...args);
        }
        catch (err) {
            this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, {
                    message: err.message,
                    stack: this.isSendErrorStack ? err.stack : undefined,
                }]);
            return;
        }
        this.sendResponse([CALL_TYPES.CALLBACK_RESPONSE, callbackName, null, result]);
    }
}
/**
 * create a proxy callback
 */
const createProxyCallback = (callback) => {
    const name = callback.__msg2call_cbname__ = `func_${proxyCallbacks.size}_${generateId()}`;
    proxyCallbacks.set(name, callback);
    callback.releaseProxy = () => {
        proxyCallbacks.delete(name);
    };
    return callback;
};
/**
 * release all created proxy callback
 */
const releaseAllProxyCallback = () => {
    proxyCallbacks.clear();
};

class Local {
    events;
    exposeObj;
    sendResponse;
    timeout;
    onCallBeforeParams;
    isSendErrorStack;
    constructor({ exposeObj, events, timeout, onCallBeforeParams, isSendErrorStack }, sendResponse) {
        this.exposeObj = exposeObj;
        this.events = events;
        this.timeout = timeout;
        this.onCallBeforeParams = onCallBeforeParams;
        this.isSendErrorStack = isSendErrorStack;
        this.sendResponse = sendResponse;
    }
    async handleCallbackData(callbackName, timeout, args) {
        return new Promise((resolve, reject) => {
            const handler = ((err, data) => {
                if (handler.timeout)
                    clearTimeout(handler.timeout);
                this.events.delete(callbackName);
                if (err == null)
                    resolve(data);
                else {
                    const error = new Error(err.message);
                    error.stack = err.stack;
                    reject(error);
                }
            });
            this.events.set(callbackName, handler);
            if (timeout) {
                handler.timeout = setTimeout(() => {
                    handler.timeout = null;
                    handler({ message: 'call remote timeout' });
                }, timeout);
            }
            this.sendResponse([CALL_TYPES.CALLBACK_REQUEST, callbackName, args]);
        });
    }
    async handleRequest(eventName, path, args, callbacks) {
        let obj = this.exposeObj;
        const name = path.pop();
        for (const _name of path) {
            obj = obj[_name];
            if (obj === undefined) {
                this.sendResponse([CALL_TYPES.RESPONSE, eventName, { message: `${_name} is not defined` }]);
                return;
            }
        }
        if (typeof obj[name] == 'function') {
            let result;
            if (callbacks.length) {
                for (const index of callbacks) {
                    // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
                    const context = this;
                    const name = args[index];
                    args.splice(index, 1, async function (...args) {
                        return context.handleCallbackData(name, context.timeout, args);
                    });
                }
            }
            // console.log('args: ', args)
            try {
                if (this.onCallBeforeParams)
                    args = this.onCallBeforeParams(args);
                result = await obj[name].apply(obj, args);
            }
            catch (err) {
                this.sendResponse([
                    CALL_TYPES.RESPONSE,
                    eventName,
                    { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
                ]);
                return;
            }
            this.sendResponse([
                CALL_TYPES.RESPONSE,
                eventName,
                null,
                result,
            ]);
        }
        else if (obj[name] === undefined) {
            this.sendResponse([
                CALL_TYPES.RESPONSE,
                eventName,
                { message: `${name} is not defined` },
            ]);
        }
        else {
            this.sendResponse([
                CALL_TYPES.RESPONSE,
                eventName,
                null,
                obj[name],
            ]);
        }
    }
}

class Remote {
    events;
    remoteGroups;
    sendRequest;
    onError;
    timeout;
    constructor(options, sendRequest) {
        this.remoteGroups = new Map();
        this.events = options.events;
        this.timeout = options.timeout;
        this.onError = options.onError;
        this.sendRequest = sendRequest;
    }
    handleGroupNextTask(groupName, error) {
        nextTick(() => {
            const group = (this.remoteGroups.get(groupName));
            group.handling = false;
            if (group.queue.length) {
                if (error == null) {
                    (group.queue.shift())[0]();
                }
                else {
                    (group.queue.shift())[1](error);
                }
            }
        });
    }
    async waitQueue(group, groupName, pathname) {
        if (group.handling) {
            await new Promise((resolve, reject) => {
                group.queue.push([resolve, (error) => {
                        reject(error);
                        this.onError?.(error, pathname, groupName);
                        this.handleGroupNextTask(groupName, error);
                    }]);
            });
        }
        group.handling = true;
    }
    async handleData(groupName, pathname, timeout, args) {
        const eventName = `${pathname.join('.')}_${generateId()}`;
        return new Promise((resolve, reject) => {
            const handler = ((err, data) => {
                if (handler.timeout)
                    clearTimeout(handler.timeout);
                this.events.delete(eventName);
                if (err == null)
                    resolve(data);
                else {
                    const error = new Error(err.message);
                    error.stack = err.stack;
                    this.onError?.(error, pathname, groupName);
                    reject(error);
                }
            });
            const callbacks = [];
            args = args.map((arg, index) => {
                if (typeof arg === 'function') {
                    if (!arg.__msg2call_cbname__)
                        throw new Error('callback is not a proxy callback');
                    callbacks.push(index);
                    return arg.__msg2call_cbname__;
                }
                return arg;
            });
            this.events.set(eventName, handler);
            if (timeout) {
                handler.timeout = setTimeout(() => {
                    handler.timeout = null;
                    handler({ message: 'call remote timeout' });
                }, timeout);
            }
            this.sendRequest([CALL_TYPES.REQUEST, eventName, pathname, args, callbacks]);
        });
    }
    async getData(groupName, pathname, args) {
        // console.log(groupName, pathname, data)
        let { timeout } = this;
        let isQueue = false;
        if (groupName != null) {
            let group = this.remoteGroups.get(groupName);
            if (group.options.timeout != null)
                timeout = group.options.timeout;
            if (group.options.queue) {
                isQueue = true;
                await this.waitQueue(group, groupName, pathname);
            }
        }
        let promise = this.handleData(groupName, pathname, timeout, args);
        if (isQueue) {
            promise = promise.then((data) => {
                this.handleGroupNextTask(groupName);
                return data;
            }).catch((error) => {
                this.handleGroupNextTask(groupName, error);
                throw error;
            });
        }
        return promise;
    }
    createProxy(context, groupName, path = []) {
        const proxy = new Proxy(function () { }, {
            get: (_target, prop, receiver) => {
                let propName = prop.toString();
                // console.log('get prop name', propName, path)
                if (prop == 'then' && path.length) {
                    const r = context.getData(groupName, path, []);
                    return r.then.bind(r);
                }
                return context.createProxy(context, groupName, [...path, propName]);
            },
            apply: async (target, thisArg, argumentsList) => context.getData(groupName, path, argumentsList),
            // deleteProperty
        });
        return proxy;
    }
    /**
     * create remote proxy object of group calls
     */
    createRemoteGroup(groupName, options = {}) {
        this.remoteGroups.set(groupName, { handling: false, queue: [], options });
        return this.createProxy(this, groupName);
    }
}

const createMessage2Call = (options) => {
    const events = new Map();
    const timeout = options.timeout ?? 120_000;
    const isSendErrorStack = options.isSendErrorStack ?? false;
    const remote = new Remote({
        events,
        timeout,
        onError: options.onError,
    }, (message) => {
        options.sendMessage(message);
    });
    const callback = new Callback(options, (message) => {
        options.sendMessage(message);
    });
    const local = new Local({
        events,
        timeout,
        isSendErrorStack,
        onCallBeforeParams: options.onCallBeforeParams,
        exposeObj: options.exposeObj,
    }, (message) => {
        options.sendMessage(message);
    });
    const handleResponse = async (name, err, data) => {
        const handler = events.get(name);
        // if (handler) {
        if (typeof handler == 'function')
            handler(err, data);
        // else if (Array.isArray(handler)) {
        //   for (const h of handler) await h(data)
        // }
        // }
    };
    const message = (message) => {
        if (!Array.isArray(message))
            throw new Error('message is not array');
        const _message = message;
        switch (_message[0]) {
            case CALL_TYPES.REQUEST:
                void local.handleRequest(_message[1], _message[2], _message[3], _message[4]);
                break;
            case CALL_TYPES.CALLBACK_REQUEST:
                void callback.handleCallbackRequest(_message[1], _message[2]);
                break;
            case CALL_TYPES.RESPONSE:
            case CALL_TYPES.CALLBACK_RESPONSE:
                void handleResponse(_message[1], _message[2], _message[3]);
                break;
        }
    };
    const destroy = () => {
        for (const handler of events.values()) {
            handler({ message: 'destroy' });
        }
    };
    return {
        /**
         * remote proxy object
         */
        remote: remote.createProxy(remote, null),
        /**
         * create remote proxy object of group calls
         */
        createRemoteGroup: remote.createRemoteGroup.bind(remote),
        /**
         * on message function
         */
        message,
        /**
         * destroy
         */
        destroy,
    };
};

export { createMessage2Call, createProxyCallback, releaseAllProxyCallback };
