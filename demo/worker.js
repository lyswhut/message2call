importScripts('../dist/message2call.min.js')
console.log('worker is running.')


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
