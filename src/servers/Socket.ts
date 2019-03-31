import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import Server from '../libs/SocketServer'
import DevTool from '../libs/DevTool'
import Base from './Base'
import { StandardResponse } from '../typings'

export default class Socket extends Base {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new Server()
    this.server.onMessage('login', this.login.bind(this))
  }

  public start (): Promise<void> {
    return new Promise((resolve) => {
      const { port } = this.options
      this.server.listen(port, resolve)
    })
  }

  public async login (socket: Connection) {
    const task = async () => {
      const qrcode = (qrcode: Buffer) => socket.send('qrcode', qrcode)
      return this.devTool.login(qrcode)
    }

    try {
      await this.execute(task)
      this.sendJson(socket, 'login')

    } catch (error) {
      let { status, message } = this.resolveCommandError(error)
      this.sendJson(socket, 'login', { status, message })
    }
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
