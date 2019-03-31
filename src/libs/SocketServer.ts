import chalk from 'chalk'
import net = require('net')
import Connection from './SocketConnection'
import stdoutServ from '../services/stdout'
import { Server, Socket } from 'net'

export default class SocketServer {
  private listeners: Array<{ event: string, handle: (socket: Connection) => Promise<void> }>
  public server: Server

  constructor () {
    this.listeners = []
    this.server = net.createServer(this.connect.bind(this))
  }

  public onMessage (event: string, handle: (socket: Connection) => Promise<void>) {
    this.listeners.push({ event, handle })
  }

  public listen (...args): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.listen(...args)
  }

  public close (): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.close()
  }

  public destory (): void {
    this.listeners.splice(0)
    this.server.close()

    this.listeners = undefined
    this.server = undefined
  }

  private async connect (socket: Socket): Promise<void> {
    let client = new Connection(socket)

    this.listeners.forEach(({ event, handle }) => {
      const listen = () => {
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.ok(`[${chalk.gray('HIT')}][${chalk.green.bold(event)}] ${datetime}`)
        handle(client)
      }

      client.on(event, listen)
    })
  }
}
