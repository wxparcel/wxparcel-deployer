import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/socket/Connection'
import SocketServer from '../libs/socket/Server'
import Service from '../libs/Service'
import DevTool from '../libs/DevTool'
import { StandardResponse, Feedback } from '../typings'

export default class SocketService extends Service {
  private options: ServerOptions
  private devTool: DevTool
  private server: SocketServer

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new SocketServer()

    this.listen('login', this.login.bind(this))
    this.listen('status', this.status.bind(this))
  }

  public async start (): Promise<void> {
    const { port } = this.options
    return this.server.listen(port)
  }

  public async status (_: Connection, feedback: Feedback): Promise<void> {
    feedback({ message: 'okaya, server is running.' })
  }

  public async login (socket: Connection, feedback: Feedback): Promise<void> {
    const task = () => {
      const qrcode = (qrcode: Buffer) => socket.send('qrcode', qrcode)
      return this.devTool.login(qrcode)
    }

    await this.execute(task).catch((error) => {
      let { status, message } = this.resolveCommandError(error)
      feedback({ status, message })
      return Promise.reject(error)
    })

    feedback()
  }

  public listen (event: string, handle: (socket: Connection, feedback: Feedback) => Promise<void>) {
    const listen = async (socket: Connection) => {
      const feedback = this.feedback.bind(this, socket, event)
      await handle(socket, feedback)
    }

    this.server.onMessage(event, listen)
  }

  private feedback (socket: Connection, eventType: string, content?: StandardResponse) {
    let response = this.standard({ ...content })
    socket.send(eventType, response)
  }

  public destory (): void {
    super.destory()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }
}
