import SocketIO = require('socket.io')
import SocketIOClient = require('socket.io-client')
import shortid = require('shortid')
import OptionManager from './OptionManager'
import DevTool from '../libs/DevTool'
import BaseService from './WebSocket'
import StreamSocket from '../libs/StreamSocket'
import SocketStream from '../libs/SocketStream'
import StdoutServ from '../services/stdout'
import { SocketToken, SocketStreamToken } from '../conf/token'

import {
  StandardJSONResponse,
  WebSocketEevent, WebSocketEeventData, WebSocketMessage
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

    this.listen('status', this.status.bind(this))
    this.listen('login', this.login.bind(this))
    this.listen('upload', this.upload.bind(this))
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

      let onConnection = (socket: SocketIO.Socket) => {
        let stdout = StdoutServ.born(socket.id)
        let onMessage = (message: any, stream?: SocketStream) => {
          let { action, token, payload } = message

          let hit = false
          let len = this.events.length
          for (let i = 0; i < len; i ++) {
            let event = this.events[i]
            if (event.type === action) {
              stdout.head('HIT').log(action)

              let datas: WebSocketEeventData = { token, payload, stream }
              event.action(socket, action, datas, stdout)

              hit = true
              break
            }
          }

          hit === false && stdout.head('MISS').log(action)
        }

        let onDisconnect = () => {
          stdout.log('disconnect')

          socket.removeAllListeners()
          streamSocket.destroy()
          stdout.destory()

          socket = undefined
          streamSocket = undefined
          stdout = undefined
          onMessage = undefined
          onDisconnect = undefined
        }

        socket.on('disconnect', onDisconnect)
        socket.on(SocketToken, onMessage)

        let streamSocket = new StreamSocket(socket)
        streamSocket.on(SocketStreamToken, onMessage)

        resolve()
      }

      this.socket.on('connect', onConnection)
      this.socket.on('connect_error', reject)
      this.socket.on('disconnect', this.destroy.bind(this))
    })
  }

  public send (type: string, data: StandardJSONResponse = {}, token: string = shortid()) {
    const params: WebSocketMessage = {
      action: type,
      token: token,
      payload: this.genStandardResponse(data)
    }

    this.socket.emit(SocketToken, params)
  }
}
