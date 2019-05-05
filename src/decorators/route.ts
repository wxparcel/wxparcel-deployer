import UserServ from '../services/user'
import { Tunnel, WebSocketTunnel } from '../typings'

export const Access = (target: any, name: any, descriptor: PropertyDescriptor) => {
  const route = descriptor.value
  descriptor.value = function (tunnel: Tunnel | WebSocketTunnel) {
    if (UserServ.isLogin !== true) {
      let error = new Error('you have not you have no permissions')
      tunnel.feedback({ status: 401, message: error.message })
      return Promise.reject(error)
    }

    return route.apply(this, arguments)
  }

  return descriptor
}
