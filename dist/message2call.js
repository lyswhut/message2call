'use strict';

const nextTick = typeof setImmediate == 'function'
    ? setImmediate
    : typeof queueMicrotask == 'function'
        ? queueMicrotask
        : setTimeout;

const emptyObj = {};
const noop = () => { };
const funcsTools = {
    funcsObj: emptyObj,
    events: emptyObj,
    queueGroups: emptyObj,
    sendMessage: noop,
    onError: noop,
    onCallBeforeParams: undefined,
    timeout: 120 * 1000,
    init(options) {
        this.funcsObj = options.funcsObj;
        this.events = new Map();
        this.queueGroups = new Map();
        this.sendMessage = options.sendMessage;
        if (options.timeout != null)
            this.timeout = options.timeout;
        if (options.onError != null)
            this.onError = options.onError;
        if (options.onCallBeforeParams != null)
            this.onCallBeforeParams = options.onCallBeforeParams;
        return this.createProxy(this, null);
    },
    async handleResponseData(eventName, path, args) {
        let obj = this.funcsObj;
        const name = path.pop();
        for (const _name of path) {
            obj = obj[_name];
            if (obj === undefined) {
                this.sendMessage({
                    name: eventName,
                    error: `${name} is not defined`,
                });
                return;
            }
        }
        if (typeof obj[name] == 'function') {
            let result;
            // console.log('args: ', args)
            try {
                if (this.onCallBeforeParams)
                    args = this.onCallBeforeParams(args);
                result = await obj[name].apply(obj, args);
            }
            catch (err) {
                this.sendMessage({
                    name: eventName,
                    error: err.message,
                });
                return;
            }
            this.sendMessage({
                name: eventName,
                error: null,
                data: result,
            });
        }
        else if (obj[name] === undefined) {
            this.sendMessage({
                name: eventName,
                error: `${name} is not defined`,
            });
        }
        else {
            this.sendMessage({
                name: eventName,
                error: null,
                data: obj[name],
            });
        }
    },
    handleGroupNextTask(groupName, error) {
        nextTick(() => {
            const group = this.queueGroups.get(groupName);
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
    async getData(groupName, pathname, data) {
        // console.log(groupName, pathname, data)
        const eventName = `${pathname.join('.')}__${String(Math.random()).substring(2)}`;
        if (groupName != null) {
            let group = this.queueGroups.get(groupName);
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
        }
        let promise = new Promise((resolve, reject) => {
            const handler = ((err, data) => {
                if (handler.timeout)
                    clearTimeout(handler.timeout);
                this.events.delete(eventName);
                if (err == null)
                    resolve(data);
                else {
                    const error = new Error(err);
                    this.onError(error, pathname, groupName);
                    reject(error);
                }
            });
            this.events.set(eventName, handler);
            handler.timeout = setTimeout(() => {
                handler.timeout = null;
                handler('timeout');
            }, this.timeout);
            this.sendMessage({
                name: eventName,
                path: pathname,
                data,
            });
        });
        if (groupName != null) {
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
    async handleGetData(name, err, data) {
        const handler = this.events.get(name);
        if (handler) {
            if (typeof handler == 'function')
                handler(err, data);
            // else if (Array.isArray(handler)) {
            //   for (const h of handler) await h(data)
            // }
        }
    },
    createProxy(context, groupName, path = []) {
        const proxy = new Proxy(function () { }, {
            get: (_target, prop, receiver) => {
                let propName = prop.toString();
                // console.log('get prop name', propName, path)
                if (prop == 'then' && path.length) {
                    const r = context.getData(groupName, path);
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
    onMessage({ name, path, error, data }) {
        if (name) {
            if (path?.length)
                void this.handleResponseData(name, path, data);
            else
                void this.handleGetData(name, error, data);
        }
    },
    onDestroy() {
        for (const handler of this.events.values()) {
            handler('destroy');
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
         * create remote proxy object of queue calls
         */
        createQueueRemote(groupName) {
            tools.queueGroups.set(groupName, { handling: false, queue: [] });
            return tools.createProxy(tools, groupName);
        },
        /**
         * on message function
         */
        onMessage: tools.onMessage.bind(tools),
        /**
         * destroy
         */
        onDestroy: tools.onDestroy.bind(tools),
    };
};

exports.createMsg2call = createMsg2call;
