# Message to call

Convert Send Message and on Message to asynchronous get and call style

## Installation

- Use npm install

```bash
# install
npm install message2call
```

```js
// import
import * as message2call from 'message2call'
```

- Use script link

```html
<script src="./message2call.min.js"></script>
```

## How to use

see [demo](https://lyswhut.github.io/message2call/demo/index.html)

`index.html` File:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <script src="../dist/message2call.min.js"></script>
  <script>
    const worker = new Worker('./worker.js')
    const exposeObj = {
      getName(fromName) {
        return 'hello ' + fromName + ', I am index.html'
      },
    }
    const message2call = Message2call.createMsg2call({
      /**
       * required proxy object
       */
      funcsObj: exposeObj,
      /**
       * send message function
       */
      sendMessage: function(data) {
        worker.message(data)
      }
    })
    worker.onmessage = (event) => {
      message2call.message(event.data)
    }

    (async() => {
      const remote = message2call.remote
      const remoteName = await remote.name
      console.log('[index]', 'remote name is ' + remoteName)

      const result = await remote.count(6)
      console.log('[index]', result)
    })()
  </script>
</body>
</html>
```

`worker.js` File:

```js
importScripts('../dist/message2call.min.js')

const exposeObj = {
  name: 'worker.js',
  async count(num) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(num + 2)
      }, 2000);
    })
  },
}
const message2call = Message2call.createMsg2call({
  /**
   * required proxy object
   */
  funcsObj: exposeObj,
  /**
   * send message function
   */
  sendMessage: function(data) {
    postMessage(data)
  },
})
onmessage = (event) => {
  message2call.message(event.data)
}

(async() => {
  const name = await message2call.remote.getName('worker.js')
  console.log('[worker]', name)
})()
```

## Options

```ts
interface Options {
  /**
   * required proxy object
   */
  funcsObj: Readonly<Record<string, ((...args: any[]) => any) | string | number | object>>
  /**
   * send message function
   */
  sendMessage: (data: Record<string, unknown>) => void
  /**
   * on call error hook
   */
  onError?: (err: Error, path: string[], groupName: string | null) => viod
  /**
   * call timeout, 0 will be no timeout
   */
  timeout?: number
  /**
   * whether the call fails to send the call stack
   */
  isSendErrorStack?: boolean
  /**
   * convert call params
   */
  onCallBeforeParams?: (rawArgs: any[]) => any[]
}
type createMsg2call = <T>(options: Options) => {
  /**
   * remote proxy object
   */
  remote: T;
  /**
   * create remote proxy object of group calls
   */
  createRemoteGroup<T_1>(groupName: string, options?: {
    /**
     * call timeout, 0 will be no timeout, default use global timeout
     */
    timeout?: number;
    /**
     * whether to use queue calls
     */
    queue?: boolean;
  }): T_1;
  /**
   * on message function
   */
  message: ({ name, path, error, data }: any) => void;
  /**
   * destroy
   */
  destroy: () => void;
}
/**
 * create a proxy callback
 */
type createProxyCallback = <T extends Function>(callback: T) => T & { releaseProxy: () => void };
/**
 * release all created proxy callback
 */
type releaseAllProxyCallback = () => void;
```

## CHANGELOG

See [CHANGELOG.md](https://github.com/lyswhut/message2call/blob/master/CHANGELOG.md)

## LICENSE

MIT
