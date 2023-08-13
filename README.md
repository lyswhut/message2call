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
}
```

<!-- ## CHANGELOG

See [CHANGELOG.md](https://github.com/lyswhut/message2call/blob/master/CHANGELOG.md) -->

## LICENSE

MIT
