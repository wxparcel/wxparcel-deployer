import { Server as HttpServer } from 'http'
import SocketIO = require('socket.io-client')
import OptionManager from './OptionManager'
import DevTool from '../libs/DevTool'
import BaseService from './WebSocket'

import { Socket } from 'socket.io-client'
import {
  StandardJSONResponse,
  WebSocketEevent, WebSocketMessage
} from '../typings'

export default class Aider extends BaseService {
  public id: string
  public options: OptionManager
  public devTool: DevTool
  public events: Array<WebSocketEevent>
  public socket: typeof Socket

  constructor (id: string, options: OptionManager, devTool: DevTool) {
    super(options, devTool)
    this.id = id
  }

  public start (url: string | HttpServer): Promise<void> {
    if (url instanceof HttpServer) {
      return Promise.reject(new Error('url must be a string'))
    }

    return new Promise((resolve, reject) => {
      const params = {
        reconnection: true,
        reconnectionDelay: 1e3,
        reconnectionDelayMax : 5e3,
        reconnectionAttempts: 0
      }

      this.socket = SocketIO(url, params)

      this.listen('status', this.status.bind(this))
      this.listen('login', this.login.bind(this))

      const onMessage = (message: WebSocketMessage) => {
        this.events.forEach((event) => {
          const { action, payload } = message
          if (event.type === action) {
            event.action(this.socket, action, payload)
          }
        })
      }

      const connection = () => {
        this.socket.on('deploy', onMessage)
        resolve()
      }

      const disconnect = () => this.destroy()

      this.socket.on('connect', connection)
      this.socket.on('connect_error', reject)
      this.socket.on('disconnect', disconnect)
    })
  }

  public on (type: string, fn: Function) {
    this.socket.on(type, fn)
  }

  public send (type: string, data: StandardJSONResponse = {}) {
    const params: WebSocketMessage = {
      action: type,
      payload: this.genStandardResponse(data)
    }

    this.socket.emit('deploy', params)
  }
}
