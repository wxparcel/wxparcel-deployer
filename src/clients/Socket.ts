import net = require('net')
import ip = require('ip')
import { EventEmitter } from 'events'
import terminalImage = require('terminal-image')
import { ClientOptions } from '../libs/OptionManager'
import Connection from '../libs/SocketConnection'
import stdoutServ from '../services/stdout'
import { StandardResponse } from '../typings'

export default class Socket extends EventEmitter {
  private options: ClientOptions
  private socket: Connection

  constructor (options: ClientOptions) {
    super()

    this.options = options
  }

  public async connect (): Promise<void> {
    const { uid, deployServer: server } = this.options
    const { port, hostname } = new URL(server)
    this.socket = await this.connectServer(Number(port), hostname)
    this.socket.carry({ uid })
  }

  private async connectServer (port: number = 3000, host: string = ip.address()): Promise<Connection> {
    let retrySeconds = 3
    let retryTimes = 3

    return new Promise((resolve) => {
      const { uid } = this.options
      const socket = net.createConnection(port, host)

      const client = new Connection(socket)
      client.carry({ uid })

      const reConnect = () => {
        stdoutServ.warn(`Disconnect, reconnect after ${retrySeconds} seconds`)
        if (0 < retryTimes --) {
          setTimeout(() => this.connectServer(port, host), retrySeconds * 1e3)
        }
      }

      const complete = () => {
        stdoutServ.ok(`Connected server ${host}:${port} successfully`)
        client.off('destroy', reConnect)
        resolve(client)
      }

      client.on('connected', complete)
      client.on('destroy', reConnect)
    })
  }

  public login (): Promise<void> {
    return new Promise((resolve, reject) => {
      const qrcode = async (qrcode: Buffer) => {
        let regexp = /^data:image\/([\w+]+);base64,([\s\S]+)/
        let base64 = qrcode.toString()
        let match = regexp.exec(base64)

        if (match) {
          let content = match[2]
          let buffer = Buffer.from(content, 'base64')
          let image = await terminalImage.buffer(buffer)

          stdoutServ.info('Please scan the QR code to log in')
          stdoutServ.log(image)
          return
        }

        reject(new Error('Login QR code is invalid, please check if the server is working properly'))
      }

      const login = (response: StandardResponse) => {
        this.resolveError(response).then(resolve).catch(reject)
      }

      this.socket.on('qrcode', qrcode)
      this.socket.on('login', login)
      this.socket.send('login')
    })
  }

  public upload (): Promise<void> {
    return new Promise((resolve) => {
      resolve()
    })
  }

  public destroy (): void {
    this.emit('destroy')

    this.socket.destroy()

    this.options = undefined
    this.socket = undefined
  }

  private resolveError (response: StandardResponse): Promise<any> {
    const { status, code, message } = response
    if (200 <= status && status < 400 && code === 0) {
      return Promise.resolve(response)
    }

    let error = new Error(message)
    stdoutServ.error(message)

    return Promise.reject(error)
  }
}
