import { Socket } from 'net'
import { EventEmitter } from 'events'
import assign = require('lodash/assign')

export default class Connection extends EventEmitter {
  private socket: Socket
  private belongings: { [key: string]: any }

  constructor (socket: Socket) {
    super()

    this.socket = socket
    this.belongings = {}

    this.listen()
  }

  public send (eventType: string, data?: any) {
    let eventBuf = this.alloc(eventType, 10)
    let typeBuf = this.alloc(data instanceof Buffer ? 0 : 1, 1)
    let dataBuf = data instanceof Buffer ? data : Buffer.from(JSON.stringify(data || ''))
    let buffer = Buffer.concat([eventBuf, typeBuf, dataBuf])

    this.socket.write(buffer)
  }

  public trigger (eventType: string, data?: any) {
    this.emit(eventType, data)
  }

  public carry (datas: { [key: string]: any }) {
    this.belongings = assign(this.belongings, datas)
  }

  public destroy (): void {
    this.destroy = Function.prototype as any

    this.socket.removeAllListeners()
    this.socket.destroy()

    this.socket = undefined
    this.listeners = undefined
  }

  private listen () {
    this.socket.on('connect', () => this.emit('connect'))
    this.socket.on('data', (data: Buffer) => this.emit('data', data))
    this.socket.on('drain', () => this.emit('drain'))
    this.socket.on('timeout', () => this.emit('timeout'))
    this.socket.on('lookup', (error: Error, address: string, family: string | number, host: string) => this.emit('lookup', error, address, family, host))
    this.socket.on('error', (error: Error) => this.emit('error', error))
    this.socket.on('end', () => this.emit('end'))
    this.socket.on('close', (hadError: boolean) => this.emit('close', hadError))

    this.socket.on('data', this.pipe.bind(this))
    this.socket.on('close', this.destroy.bind(this))
  }

  private pipe (source: Buffer) {
    let eventType = source.slice(0, 10).filter(char => char).toString()
    let dataType = source.slice(10, 11)[0]
    let dataBuf = source.slice(11, source.byteLength)

    switch (dataType) {
      case 0: {
        this.trigger(eventType, dataBuf)
        break
      }

      case 1: {
        let data = dataBuf.toString()

        try {
          let json = JSON.parse(data)
          this.trigger(eventType, json)
        } catch (error) {
          this.trigger(eventType, data)
        }

        break
      }
    }
  }

  private alloc (content: string | number, size: number = typeof content === 'string' ? content.length : 1) {
    let buffer = Buffer.allocUnsafe(size)
    if (typeof content === 'string') {
      for (let i = 0; i < size; i ++) {
        buffer.writeUInt8(content.charCodeAt(i), i)
      }

    } else if (typeof content === 'number') {
      buffer.writeInt8(content, 0)
    }

    return buffer
  }
}
