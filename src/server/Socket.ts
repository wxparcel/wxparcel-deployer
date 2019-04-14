import { ServerOptions } from '../libs/OptionManager'
import Connection from '../libs/socket/Connection'
import SocketServer from '../libs/socket/Server'
import Service from '../libs/Service'
import DevTool from '../libs/DevTool'
import { StandardResponse, SocketServerTunnel } from '../typings'

export default class SocketService extends Service {
  private options: ServerOptions
  private devTool: DevTool
  private server: SocketServer

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new SocketServer()
  }

  public async start (): Promise<void> {
    const { port } = this.options

    this.listen('login', this.login.bind(this))
    this.listen('status', this.status.bind(this))

    return this.server.listen(port)
  }

  public async status (tunnel: SocketServerTunnel): Promise<void> {
    const { feedback } = tunnel
    feedback({ message: 'okaya, server is running.' })
  }

  public async login (tunnel: SocketServerTunnel): Promise<void> {
    const { socket, feedback } = tunnel

    const command = (killToken: symbol) => {
      const qrcode = (qrcode: Buffer) => socket.send('qrcode', qrcode)
      return this.devTool.login(qrcode, killToken)
    }

    await this.execute(command).catch((error) => {
      let { status, message } = this.resolveCommandError(error)
      feedback({ status, message })
      return Promise.reject(error)
    })

    feedback()
  }

  public listen (event: string, handle: (tunnel: SocketServerTunnel) => Promise<void>) {
    const listen = async (socket: Connection) => {
      const feedback = this.feedback.bind(this, socket, event)
      const log = this.log.bind(this)

      await handle({ socket, feedback, log }).catch((error) => {
        return Promise.reject(error)
      })
    }

    this.server.onMessage(event, listen)
  }

  private feedback (socket: Connection, eventType: string, content?: StandardResponse) {
    let response = this.standard({ ...content })
    socket.send(eventType, response)
  }

  public destroy (): void {
    super.destroy()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }
}
