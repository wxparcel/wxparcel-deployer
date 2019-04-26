import SocketIO = require('socket.io')
import OptionManager from './OptionManager'
import BaseService from '../libs/Service'
import DevTool from '../libs/DevTool'
import { killProcess } from '../share/fns'

import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import {
  StandardJSONResponse,
  WebSocketMessage, WebSocketEevent, WebSocketPayload, WebSocketTunnel
} from '../typings'

export default class Server extends BaseService {
  public options: OptionManager
  public devTool: DevTool
  public server: SocketServer
  public events: Array<WebSocketEevent>

  constructor (options: OptionManager, devTool?: DevTool) {
    super()

    this.options = options
    this.devTool = devTool || new DevTool(this.options)
    this.events = []
  }

  public async start (server?: HttpServer): Promise<void> {
    if (this.server) {
      return Promise.reject(new Error('Server is running'))
    }

    if (server instanceof HttpServer) {
      this.server = SocketIO(server)

    } else {
      const { port } = this.options
      this.server = SocketIO(port)
    }

    const connection = (socket: Socket) => {
      const onMessage = (message: WebSocketMessage) => {
        const { action, payload } = message
        this.events.forEach((event) => {
          if (event.type === action) {
            event.action(socket, action, payload)
          }
        })
      }

      socket.on('deploy', onMessage)
    }

    this.listen('checkStatus', this.status.bind(this))
    this.listen('login', this.login.bind(this))

    this.server.on('connection', connection)
  }

  public async status (tunnel: WebSocketTunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

  public async login (tunnel: WebSocketTunnel): Promise<void> {
    let retryTimes = 0

    const execute = () => {
      const command = (killToken: symbol) => {
        const qrcode = (qrcode: Buffer) => {
          if (qrcode.byteLength === 0) {
            killProcess(killToken)
            return
          }

          this.feedback(tunnel.socket as Socket, 'qrcode', { data: qrcode })
        }

        return this.devTool.login(qrcode, killToken)
      }

      return this.execute(command).catch((error) => {
        if (retryTimes ++ <= 3) {
          return execute()
        }

        if (error.code === 255) {
          tunnel.feedback({ status: 408, message: 'Login fail' })
          return Promise.reject(error)
        }

        let { status, message } = this.resolveCommandError(error)
        tunnel.feedback({ status, message })
        return Promise.reject(error)
      })
    }

    execute().then(() => tunnel.feedback())
  }

  public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>): void {
    const action = async (socket: Socket, action: string, payload: WebSocketPayload): Promise<any> => {
      const feedback = this.feedback.bind(this, socket, action)
      return listener({ socket, payload, feedback })
    }

    this.events.push({ type, action })
  }

  public feedback (socket: Socket, type: string, data: StandardJSONResponse = {}): void {
    const params: WebSocketMessage = {
      action: type,
      payload: this.genStandardResponse(data)
    }

    socket.emit('deploy', params)
  }

  public destroy (): void {
    super.destroy()

    this.server.close()
    this.devTool.destroy()

    this.server = undefined
    this.devTool = undefined
    this.options = undefined

    this.destroy = Function.prototype as any
  }
}
