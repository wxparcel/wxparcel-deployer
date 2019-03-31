import net = require('net')
import ip = require('ip')
import { ClientOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import stdoutServ from '../services/stdout'

export default class SocketClient {
  private options: ClientOptions

  constructor (options: ClientOptions) {
    this.options = options

    this.connect().then((socket: Connection) => {
      socket.on('qrcode', (qrcode: Buffer) => {
        console.log(qrcode.toString())
      })

      socket.on('logined', () => {
        console.log('logined')
      })

      socket.send('login')
    })
  }

  private async connect (port: number = 3000, host: string = ip.address()): Promise<Connection> {
    return new Promise((resolve) => {
      const { uid } = this.options
      const socket = net.createConnection(port, host)
      const client = new Connection(socket)
      client.carry({ uid })

      const reConnect = () => {
        stdoutServ.warn('Disconnect, reconnect after 3 seconds')
        setTimeout(() => this.connect(port, host), 3e3)
      }

      const complete = () => {
        stdoutServ.ok(`Connected server ${host}:${port} successfully`)
        resolve(client)
      }

      client.on('connected', complete)
      client.on('destroy', reConnect)
    })
  }
}
