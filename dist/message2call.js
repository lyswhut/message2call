'use strict';

const nextTick = typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
        ? queueMicrotask
        : (callback) => {
            void Promise.resolve().then(callback);
        };

var CALL_TYPES;
(function (CALL_TYPES) {
    CALL_TYPES[CALL_TYPES["REQUEST"] = 0] = "REQUEST";
    CALL_TYPES[CALL_TYPES["RESPONSE"] = 1] = "RESPONSE";
    CALL_TYPES[CALL_TYPES["CALLBACK_REQUEST"] = 2] = "CALLBACK_REQUEST";
    CALL_TYPES[CALL_TYPES["CALLBACK_RESPONSE"] = 3] = "CALLBACK_RESPONSE";
})(CALL_TYPES || (CALL_TYPES = {}));
const proxyCallbacks = new Map();
const emptyObj = {};
const noop = () => { };
const funcsTools = {
    funcsObj: emptyObj,
    events: emptyObj,
    remoteGroups: emptyObj,
    sendMessage: noop,
    onError: noop,
    onCallBeforeParams: undefined,
    timeout: 120 * 1000,
    isSendErrorStack: false,
    init(options) {
        this.funcsObj = options.funcsObj;
        this.events = new Map();
        this.remoteGroups = new Map();
        this.sendMessage = options.sendMessage;
        if (options.timeout != null)
            this.timeout = options.timeout;
        if (options.isSendErrorStack != null)
            this.isSendErrorStack = options.isSendErrorStack;
        if (options.onError != null)
            this.onError = options.onError;
        if (options.onCallBeforeParams != null)
            this.onCallBeforeParams = options.onCallBeforeParams;
        return this.createProxy(this, null);
    },
    async handleCallbackRequest(callbackName, args) {
        const handler = proxyCallbacks.get(callbackName);
        if (!handler) {
            this.sendMessage({
                type: CALL_TYPES.CALLBACK_RESPONSE,
                name: callbackName,
                error: { message: `${callbackName} is released` },
            });
            return;
        }
        let result;
        try {
            result = await handler(...args);
        }
        catch (err) {
            this.sendMessage({
                type: CALL_TYPES.CALLBACK_RESPONSE,
                name: callbackName,
                error: { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
            });
            return;
        }
        this.sendMessage({
            type: CALL_TYPES.RESPONSE,
            name: callbackName,
            error: null,
            data: result,
        });
    },
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
            this.sendMessage({
                type: CALL_TYPES.CALLBACK_REQUEST,
                name: callbackName,
                args,
            });
        });
    },
    async handleRequest(eventName, path, args, callbacks) {
        let obj = this.funcsObj;
        const name = path.pop();
        for (const _name of path) {
            obj = obj[_name];
            if (obj === undefined) {
                this.sendMessage({
                    type: CALL_TYPES.RESPONSE,
                    name: eventName,
                    error: { message: `${name} is not defined` },
                });
                return;
            }
        }
        if (typeof obj[name] == 'function') {
            let result;
            if (callbacks.length) {
                for (const index of callbacks) {
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
                this.sendMessage({
                    type: CALL_TYPES.RESPONSE,
                    name: eventName,
                    error: { message: err.message, stack: this.isSendErrorStack ? err.stack : undefined },
                });
                return;
            }
            this.sendMessage({
                type: CALL_TYPES.RESPONSE,
                name: eventName,
                error: null,
                data: result,
            });
        }
        else if (obj[name] === undefined) {
            this.sendMessage({
                type: CALL_TYPES.RESPONSE,
                name: eventName,
                error: { message: `${name} is not defined` },
            });
        }
        else {
            this.sendMessage({
                type: CALL_TYPES.RESPONSE,
                name: eventName,
                error: null,
                data: obj[name],
            });
        }
    },
    handleGroupNextTask(groupName, error) {
        nextTick(() => {
            const group = this.remoteGroups.get(groupName);
            group.handling = false;
            if (group.queue.length) {
                if (error == null) {
                    group.queue.shift()[0]();
                }
                else {
                    group.queue.shift()[1](error);
                }
            }
        });
    },
    async waitQueue(group, groupName, pathname) {
        if (group.handling) {
            await new Promise((resolve, reject) => {
                group.queue.push([resolve, (error) => {
                        reject(error);
                        this.onError(error, pathname, groupName);
                        this.handleGroupNextTask(groupName, error);
                    }]);
            });
        }
        group.handling = true;
    },
    async handleData(groupName, pathname, timeout, args) {
        const eventName = `${pathname.join('.')}__${String(Math.random()).substring(2)}`;
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
                    this.onError(error, pathname, groupName);
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
            this.sendMessage({
                type: CALL_TYPES.REQUEST,
                name: eventName,
                path: pathname,
                args,
                cbs: callbacks,
            });
        });
    },
    async getData(groupName, pathname, args) {
        // console.log(groupName, pathname, data)
        let timeout = this.timeout;
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
                // eslint-disable-next-line @typescript-eslint/promise-function-async
            }).catch((error) => {
                this.handleGroupNextTask(groupName, error);
                return Promise.reject(error);
            });
        }
        return promise;
    },
    async handleResponse(name, err, data) {
        const handler = this.events.get(name);
        // if (handler) {
        if (typeof handler == 'function')
            handler(err, data);
        // else if (Array.isArray(handler)) {
        //   for (const h of handler) await h(data)
        // }
        // }
    },
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
            // eslint-disable-next-line @typescript-eslint/promise-function-async
            apply: (target, thisArg, argumentsList) => {
                return context.getData(groupName, path, argumentsList);
            },
            // deleteProperty
        });
        return proxy;
    },
    onMessage(message) {
        switch (message.type) {
            case CALL_TYPES.REQUEST:
                void this.handleRequest(message.name, message.path, message.args, message.cbs);
                break;
            case CALL_TYPES.CALLBACK_REQUEST:
                void this.handleCallbackRequest(message.name, message.args);
                break;
            case CALL_TYPES.RESPONSE:
            case CALL_TYPES.CALLBACK_RESPONSE:
                void this.handleResponse(message.name, message.error, message.data);
                break;
        }
    },
    onDestroy() {
        for (const handler of this.events.values()) {
            handler({ message: 'destroy' });
        }
    },
};
const createMsg2call = (options) => {
    const tools = Object.create(funcsTools);
    return {
        /**
         * remote proxy object
         */
        remote: tools.init(options),
        /**
         * create remote proxy object of group calls
         */
        createRemoteGroup(groupName, options = {}) {
            tools.remoteGroups.set(groupName, { handling: false, queue: [], options });
            return tools.createProxy(tools, groupName);
        },
        /**
         * on message function
         */
        message: tools.onMessage.bind(tools),
        /**
         * destroy
         */
        destroy: tools.onDestroy.bind(tools),
    };
};
/**
 * create a proxy callback
 */
const createProxyCallback = (callback) => {
    const name = callback.__msg2call_cbname__ = `func_${proxyCallbacks.size}_${String(Math.random()).substring(2, 10)}`;
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

exports.createMsg2call = createMsg2call;
exports.createProxyCallback = createProxyCallback;
exports.releaseAllProxyCallback = releaseAllProxyCallback;
