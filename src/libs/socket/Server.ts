import chalk from 'chalk'
import net = require('net')
import Connection from './Connection'
import stdoutServ from '../../services/stdout'
import { Server as NetServer, Socket } from 'net'

export default class Server {
  private listeners: Array<{ event: string, handle: (socket: Connection) => Promise<void> }>
  public server: NetServer

  constructor () {
    this.listeners = []
    this.server = net.createServer(this.connect.bind(this))
  }

  public onMessage (event: string, handle: (socket: Connection) => Promise<void>) {
    this.listeners.push({ event, handle })
  }

  public listen (port: number, hostname?: string, backlog?: number): Promise<void> {
    if (!this.server) {
      return Promise.reject(new Error('Server is not running'))
    }

    return new Promise((resolve, reject) => {
      this.server.on('error', reject)
      this.server.listen(port, hostname, backlog, resolve)
    })
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
