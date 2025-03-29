import type { Options } from '../types/common'
import { Callback } from './callback'
import { Local } from './local'
import { Remote } from './remote'
import { CALL_TYPES, type RequestMessage, type ResponseMessage, type Events, type RequestCallbackMessage } from './shared'

export const createMessage2Call = <T>(options: Options) => {
  const events: Events = new Map()
  const timeout = options.timeout ?? 120_000
  const isSendErrorStack = options.isSendErrorStack ?? false

  const remote = new Remote({
    events,
    timeout,
    onError: options.onError,
  }, (message) => {
    options.sendMessage(message)
  })
  const callback = new Callback(options, (message) => {
    options.sendMessage(message)
  })
  const local = new Local({
    events,
    timeout,
    isSendErrorStack,
    onCallBeforeParams: options.onCallBeforeParams,
    proxyObj: options.proxyObj,
  }, (message) => {
    options.sendMessage(message)
  })

  const handleResponse = async(name: string, err: { message: string, stack?: string } | null, data?: unknown) => {
    const handler = events.get(name)
    // if (handler) {
    if (typeof handler == 'function') handler(err, data)
    // else if (Array.isArray(handler)) {
    //   for (const h of handler) await h(data)
    // }
    // }
  }
  const message = (message: unknown) => {
    if (!Array.isArray(message)) throw new Error('message is not array')
    const _message = message as ResponseMessage | RequestMessage | RequestCallbackMessage
    switch (_message[0]) {
      case CALL_TYPES.REQUEST:
        void local.handleRequest(_message[1], _message[2], _message[3], _message[4])
        break
      case CALL_TYPES.CALLBACK_REQUEST:
        void callback.handleCallbackRequest(_message[1], _message[2])
        break
      case CALL_TYPES.RESPONSE:
      case CALL_TYPES.CALLBACK_RESPONSE:
        void handleResponse(_message[1], _message[2], _message[3])
        break
    }
  }
  const destroy = () => {
    for (const handler of events.values()) {
      handler({ message: 'destroy' })
    }
  }

  return {
    /**
     * remote proxy object
     */
    remote: remote.createProxy<T>(remote, null),
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
  }
}
