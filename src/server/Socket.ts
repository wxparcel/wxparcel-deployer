import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/socket/Connection'
import SocketServer from '../libs/socket/Server'
import Service from '../libs/Service'
import DevTool from '../libs/DevTool'
import { StandardResponse } from '../typings'

export default class SocketService extends Service {
  private options: ServerOptions
  private devTool: DevTool
  private server: SocketServer

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new SocketServer()

    this.server.onMessage('login', this.login.bind(this))
    this.server.onMessage('status', this.status.bind(this))
  }

  public async start (): Promise<void> {
    const { port } = this.options
    return this.server.listen(port)
  }

  public async status (socket: Connection): Promise<void> {
    this.sendJson(socket, 'status', { message: 'okaya, server is running.' })
  }

  public async login (socket: Connection): Promise<void> {
    const task = () => {
      const qrcode = (qrcode: Buffer) => socket.send('qrcode', qrcode)
      return this.devTool.login(qrcode)
    }

    await this.execute(task).catch((error) => {
      let { status, message } = this.resolveCommandError(error)
      this.sendJson(socket, 'login', { status, message })
      return Promise.reject(error)
    })

    this.sendJson(socket, 'login')
  }

  public destory (): void {
    super.destory()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }

  private sendJson (socket: Connection, eventType: string, content?: StandardResponse) {
    let response = this.standard({ ...content })
    socket.send(eventType, response)
  }
}
