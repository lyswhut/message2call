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
        worker.postMessage(data)
      },
      /**
       * on call error hook
       */
      onError: function(err, path, groupName) {
        console.log('error:', err, path, groupName)
      },
      /**
       * call timeout
       */
      timeout: 20000,
      /**
       * convert call params
       */
      onCallBeforeParams: function(rawArgs) {
        return rawArgs
      }
    })
    worker.onmessage = (event) => {
      message2call.onMessage(event.data)
    }

    (async() => {
      const name = await message2call.remote.getName('index.html')
      console.log('[index]',name)

      const result = await message2call.remote.count(6)
      console.log('[index]',result)
    })()
  </script>
</body>
</html>
```

`worker.js` File:

```js
importScripts('../dist/message2call.min.js')
console.log('worker is running.')


const exposeObj = {
  getName(fromName) {
    return 'hello ' + fromName + ', I am worker.js'
  },
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
  /**
   * on call error hook
   */
  onError: function(err, path, groupName) {
    console.log('error:', err, path, groupName)
  },
  /**
   * call timeout
   */
  timeout: 20000,
  /**
   * convert call params
   */
  onCallBeforeParams: function(rawArgs) {
    return rawArgs
  }
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
type ReadObj = Record<string, ((...args: any[]) => any) | string | number | object>

interface Options {
  /**
   * required proxy object
   */
  funcsObj: Readonly<ReadObj>
  /**
   * send message function
   */
  sendMessage: (data: Record<string, unknown>) => void
  /**
   * on call error hook
   */
  onError?: (err: Error, path: string[], groupName: string | null) => viod
  /**
   * call timeout
   */
  timeout?: number
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
   * create remote proxy object of queue calls
   */
  createQueueRemote<T_1>(groupName: string): T_1;
  /**
   * on message
   */
  message: ({ name, path, error, data }: any) => void;
  /**
   * destroy
   */
  destroy: () => void;
}
```

<!-- ## CHANGELOG

See [CHANGELOG.md](https://github.com/lyswhut/message2call/blob/master/CHANGELOG.md) -->

## LICENSE

MIT
