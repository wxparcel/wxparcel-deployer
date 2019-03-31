import net = require('net')
import ip = require('ip')
import terminalImage = require('terminal-image')
import { ClientOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import stdoutServ from '../services/stdout'

export default class Socket {
  private options: ClientOptions
  private socket: Connection

  constructor (options: ClientOptions) {
    this.options = options
  }

  public async connect (): Promise<void> {
    const { uid, server } = this.options
    const { port, hostname } = new URL(server)
    this.socket = await this.connectServer(Number(port), hostname)
    this.socket.carry({ uid })
  }

  private async connectServer (port: number = 3000, host: string = ip.address()): Promise<Connection> {
    return new Promise((resolve) => {
      const { uid } = this.options
      const socket = net.createConnection(port, host)

      const client = new Connection(socket)
      client.carry({ uid })

      const reConnect = () => {
        stdoutServ.warn('Disconnect, reconnect after 3 seconds')
        setTimeout(() => this.connectServer(port, host), 3e3)
      }

      const complete = () => {
        stdoutServ.ok(`Connected server ${host}:${port} successfully`)
        resolve(client)
      }

      client.on('connected', complete)
      client.on('destroy', reConnect)
    })
  }

  public login (): Promise<void> {
    return new Promise((resolve) => {
      const qrcode = async (qrcode: Buffer) => {
        let image = await terminalImage.buffer(qrcode)
        console.log(image)
      }

      this.socket.on('qrcode', qrcode)
      this.socket.on('login', resolve)
      this.socket.send('login')
    })
  }
}
