import net = require('net')
import ip = require('ip')
import fs = require('fs-extra')
import { EventEmitter } from 'events'
import terminalImage = require('terminal-image')
import { ClientOptions } from '../libs/OptionManager'
import Connection from '../libs/socket/Connection'
import stdoutServ from '../services/stdout'
import { StandardResponse } from '../typings'

export default class SocketClient extends EventEmitter {
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

  private connectServer (port: number = 3000, host: string = ip.address()): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(port, host)
      const client = new Connection(socket)

      const connected = () => {
        stdoutServ.ok(`Connected server ${host}:${port} successfully`)
        resolve(client)
      }

      client.on('connect', connected)
      client.on('error', reject)
    })
  }

  public status (): Promise<void> {
    return new Promise((resolve, reject) => {
      const status = (response: StandardResponse) => {
        this.intercept(response).then(resolve).catch(reject)
      }

      this.socket.once('status', status)
      this.socket.send('status')
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
        this.intercept(response).then(resolve).catch(reject)
      }

      this.socket.once('qrcode', qrcode)
      this.socket.once('login', login)
      this.socket.send('login')
    })
  }

  public destroy (): void {
    this.emit('destroy')

    this.socket.destroy()

    this.options = undefined
    this.socket = undefined
  }

  private intercept (response: StandardResponse): Promise<any> {
    const { status, code, message } = response
    if (200 <= status && status < 400 && code === 0) {
      return Promise.resolve(response)
    }

    let error = new Error(message)
    stdoutServ.error(message)

    return Promise.reject(error)
  }
}
