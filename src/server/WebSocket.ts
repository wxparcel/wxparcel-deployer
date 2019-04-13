import SocketIO = require('socket.io')
import { ServerOptions } from '../libs/OptionManager'
import Service from '../libs/Service'
import DevTool from '../libs/DevTool'
import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import {
  StandardResponse,
  Feedback,
  WebSocketEevent,
  WebSocketRequestMessage,
  WebSocketResponseMessage,
  WebSocketTunnel
} from '../typings'

export default class WebSocketServer extends Service {
  private options: ServerOptions
  private devTool: DevTool
  private server: SocketServer
  private events: Array<WebSocketEevent>

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.events = []
  }

  public async start (httpServer?: HttpServer): Promise<void> {
    if (this.server) {
      return Promise.reject(new Error('Server is running'))
    }

    if (httpServer instanceof HttpServer) {
      this.server = SocketIO(httpServer)
    } else {
      const { port } = this.options
      this.server = SocketIO(port)
    }

    const connection = (socket: Socket) => {
      const onMessage = (message: WebSocketRequestMessage) => {
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
    const { feedback } = tunnel
    feedback({ message: 'okaya, server is running.' })
  }

  public async login (tunnel: WebSocketTunnel): Promise<void> {
    const { feedback, socket } = tunnel

    const task = () => {
      const qrcode = (qrcode: Buffer) => this.feedback(socket as Socket, 'qrcode', { data: qrcode })
      return this.devTool.login(qrcode)
    }

    await this.execute(task).catch((error) => {
      if (error.code === 255) {
        feedback({ status: 408, message: 'Login fail' })
        return Promise.reject(error)
      }

      let { status, message } = this.resolveCommandError(error)
      feedback({ status, message })
      return Promise.reject(error)
    })

    feedback()
  }

  public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>): void {
    const action = async (socket: Socket, action: string, payload: any): Promise<any> => {
      const feedback = this.feedback.bind(this, socket, action)
      const log = this.log.bind(this)
      return listener({ payload, feedback, socket, log })
    }

    this.events.push({ type, action })
  }

  private feedback (socket: Socket, type: string, data: StandardResponse = {}): void {
    const params: WebSocketResponseMessage = {
      action: type,
      payload: this.standard(data)
    }

    socket.emit('deploy', params)
  }

  public destory (): void {
    super.destory()
    this.server.close()

    this.devTool = undefined
    this.options = undefined
    this.server = undefined
  }
}
