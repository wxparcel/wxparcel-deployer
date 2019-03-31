import assign = require('lodash/assign')
import remove = require('lodash/remove')
import { Socket } from 'net'

export default class SocketConnection {
  private socket: Socket
  private listeners: Array<{ eventType: string | symbol, handle: (data: any, socket: SocketConnection) => void}>
  private belongings: { [key: string]: any }

  constructor (socket: Socket) {
    this.socket = socket
    this.listeners = []
    this.belongings = {}

    this.socket.connecting === true
    ? this.socket.on('connect', this.register.bind(this))
    : this.register()
  }

  public on (eventType: string, handle: (data: any, socket: SocketConnection) => void): void {
    this.listeners.push({ eventType, handle })
  }

  public off (eventType: string, handle?: (data: any, socket: SocketConnection) => void): void {
    remove(this.listeners, (item) => {
      if (item.eventType === eventType) {
        return handle ? handle === item.handle : true
      }

      return false
    })
  }

  public send (eventType: string, data?: any) {
    let eventBuf = this.alloc(eventType, 10)
    let typeBuf = this.alloc(data instanceof Buffer ? 0 : 1, 1)
    let dataBuf = data instanceof Buffer ? data : Buffer.from(JSON.stringify(data || ''))
    let buffer = Buffer.concat([eventBuf, typeBuf, dataBuf])

    this.socket.write(buffer)
  }

  public trigger (eventType: string, data?: any) {
    this.listeners.forEach((item) => {
      if (eventType === item.eventType) {
        item.handle(data, this)
      }
    })
  }

  public carry (datas: { [key: string]: any }) {
    this.belongings = assign(this.belongings, datas)
  }

  public destroy () {
    this.trigger('destroy')

    this.socket.removeAllListeners()
    this.socket.destroy()
    this.listeners.splice(0)

    this.socket = undefined
    this.listeners = undefined
  }

  private register () {
    this.trigger('connected')

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
