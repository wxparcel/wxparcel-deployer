import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import Server from '../libs/SocketServer'
import DevTool from '../libs/DevTool'
import Base from './Base'

export default class Socket extends Base {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server

  constructor (options: ServerOptions) {
    super()

    this.options = options
  }

  public start (): Promise<void> {
    return new Promise((resolve) => {
      const { deployServerPort } = this.options
      this.devTool = new DevTool(this.options)

      this.server = new Server()
      this.server.onMessage('login', this.login.bind(this))
      this.server.listen(deployServerPort, resolve)
    })
  }

  public login (socket: Connection) {
    return this.execute(async () => {
      await this.devTool.login((qrcode: Buffer) => {
        socket.send('qrcode', qrcode)
      })

      socket.send('logined')
    })
  }
}
