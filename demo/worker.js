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
  async callFailed() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Test call failed'))
      }, 2000);
    })
  },
  async downloadFile(title, callback) {
    console.log('start download', title)
    let total = 0
    const timeout = setInterval(() => {
      total += (Math.floor(Math.random() * 2000) + 500) / 100
      total = Number(total.toFixed(2))
      if (total >= 100) {
        total = 100
        clearInterval(timeout)
      }
      callback(total).then((message) => {
        console.log('[worker]', 'callback result: ' + message)
      })
    }, 500)
  },
}
const message2call = Message2call.createMessage2Call({
  /**
   * required proxy object
   */
  proxyObj: exposeObj,
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
   * whether the call fails to send the call stack
   */
  isSendErrorStack: true,
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
