import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import Server from '../libs/SocketServer'
import DevTool from '../libs/DevTool'
import Base from './Base'
import { Server as SocketServ } from 'net'
import { Server as HttpServ } from 'http'

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

  public attach (server: HttpServ) {
    this.server.attach(server)
  }

  public async login (socket: Connection) {
    await this.execute(async () => {
      await this.devTool.login((qrcode: Buffer) => {
        // socket.send('qrcode', qrcode)
      })
    })

    socket.send('logined')
  }

  public destory (): void {
    super.destory()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }

  public getServer (): SocketServ {
    return this.server ? this.server.server : null
  }
}
