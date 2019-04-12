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
  WebSocketResponseMessage
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

    this.register('checkStatus', this.status.bind(this))
    this.register('login', this.login.bind(this))
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

    this.server.on('connection', connection)
  }

  public async status (_: WebSocketRequestMessage, feedback: Feedback): Promise<void> {
    feedback({ message: 'okaya, server is running.' })
  }

  public async login (_: WebSocketRequestMessage, feedback: Feedback, socket: Socket): Promise<void> {
    const task = () => {
      const qrcode = (qrcode: Buffer) => this.feedback(socket, 'qrcode', { data: qrcode })
      return this.devTool.login(qrcode)
    }

    await this.execute(task).catch((error) => {
      let { status, message } = this.resolveCommandError(error)
      feedback({ status, message })
      return Promise.reject(error)
    })

    feedback({})
  }

  private feedback (socket: Socket, type: string, data: StandardResponse = {}): void {
    const params: WebSocketResponseMessage = {
      action: type,
      payload: this.standard(data)
    }

    socket.emit('deploy', params)
  }

  private register (type: string, listener: (payload: any, feedback: Feedback, socket: Socket) => Promise<any>): void {
    const action = async (socket: Socket, action: string, payload: any): Promise<any> => {
      const feedback = this.feedback.bind(this, socket, action)
      return listener(payload, feedback, socket)
    }

    this.events.push({ type, action })
  }

  public destory (): void {
    super.destory()
    this.server.close()

    this.devTool = undefined
    this.options = undefined
    this.server = undefined
  }
}
