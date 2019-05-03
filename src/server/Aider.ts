import SocketIO = require('socket.io')
import SocketIOClient = require('socket.io-client')
import SocketIOStream = require('socket.io-stream')
import OptionManager from './OptionManager'
import DevTool from '../libs/DevTool'
import BaseService from './WebSocket'
import SocketStream from '../libs/SocketStream'
import StdoutServ from '../services/stdout'
import { SocketToken } from '../conf/token'

import {
  StandardJSONResponse,
  WebSocketEevent, WebSocketMessage
} from '../typings'

export default class Aider extends BaseService {
  public id: string
  public options: OptionManager
  public devTool: DevTool
  public events: Array<WebSocketEevent>
  public socket: typeof SocketIOClient.Socket

  constructor (id: string, options: OptionManager, devTool: DevTool) {
    super(options, devTool)
    this.id = id
  }

  public connect (url: string): Promise<void> {
    if (typeof url !== 'string') {
      return Promise.reject(new Error('url must be a string'))
    }

    return new Promise((resolve, reject) => {
      const params = {
        reconnection: true,
        reconnectionDelay: 1e3,
        reconnectionDelayMax : 5e3,
        reconnectionAttempts: 0
      }

      this.socket = SocketIOClient(url, params)

      this.listen('status', this.status.bind(this))
      this.listen('login', this.login.bind(this))
      this.listen('upload', this.upload.bind(this))

      const connection = (socket: SocketIO.Socket) => {
        const stdout = StdoutServ.born(socket.id)

        const onMessage = (message: any, stream?: SocketStream) => {
          let { action, token, payload } = message
          this.events.forEach((event) => {
            if (event.type === action) {
              event.action(socket, action, { token, payload, stream }, stdout)
            }
          })
        }

        socket.on(SocketToken, onMessage)
        SocketIOStream(socket).on(SocketToken, onMessage)

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

    this.socket.emit(SocketToken, params)
  }
}
