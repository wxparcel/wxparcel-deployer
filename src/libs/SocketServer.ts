import net = require('net')
import Connection from './SocketConnection'
import { Socket } from 'net'

export default class SocketServer {
  private listeners: Array<{ event: string, handle: (socket: Connection) => Promise<void> }>
  private server: net.Server

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

  public destory () {
    this.listeners.splice(0)
    this.server.close()

    this.listeners = undefined
    this.server = undefined
  }

  private async connect (socket: Socket) {
    let client = new Connection(socket)

    this.listeners.forEach(({ event, handle }) => {
      client.on(event, handle.bind(null, client))
    })
  }
}
