import { Duplex } from 'stream'
import StreamSocket from './StreamSocket'

export default class SocketStream extends Duplex {
  public id: string
  public socket: StreamSocket
  public _readable: boolean
  public _writable: boolean
  public _readableState: any
  public _writableState: any
  public destroyed: boolean
  private pushTasks: Array<() => boolean>
  private writeTasks: Array<() => void>

  constructor (id?: string, socket?: StreamSocket) {
    super()

    this.id = id
    this.socket = socket
    this._readable = false
    this._writable = false
    this.destroyed = false
    this.pushTasks = []
    this.writeTasks = []

    this.on('finish', this._onfinish.bind(this))
    this.on('end', this._end.bind(this))
    this.on('error', this._onerror.bind(this))
  }

  public _read (size: number) {
    if (this.destroyed) {
      return
    }

    if (this.pushTasks.length) {
      while (true) {
        const push = this.pushTasks.shift()
        if (!(push && push())) {
          break
        }
      }

      return
    }

    this._readable = true
    this.socket.read(this.id, size)
  }

  public _write (chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    const write = () => {
      if (this.destroyed) {
        return
      }

      this._writable = false
      this.socket.write(this.id, chunk, encoding, callback)
    }

    if (this._writable === true) {
      write()
      return
    }

    this.writeTasks.push(write)
  }

  public _onread (): void {
    let write = this.writeTasks.shift()
    if (write) {
      return write()
    }

    this._writable = true
  }

  public _onwrite (chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this._writable = true

    const push = () => {
      this._readable = false

      let repsonse = this.push(chunk || '', encoding)
      callback(null)
      return repsonse
    }

    if (this._readable === true) {
      push()
      return
    }

    this.pushTasks.push(push)
  }

  public _end (): void {
    if (this.pushTasks.length) {
      this.pushTasks.push(this._done.bind(this))
      return
    }

    this._done()
  }

  public _done (): void {
    this._readable = false
    this.push(null)
  }

  public _onfinish (): void {
    this.socket.end(this.id)
    this.writable = false
    this._writableState.ended = true

    if (!this.readable || this._readableState.ended) {
      return this.destroy()
    }

    this.push(null)
    if (this.readable && !this._readableState.endEmitted) {
      this.read(0)
    }
  }

  public _onend (): void {
    this.readable = false
    this._readableState.ended = true

    if (!this.writable || this._writableState.finished) {
      return this.destroy()
    }

    this.end()
  }

  public _onerror (error): void {
    this.socket.error(this.id, error)
    this.destroy()
  }

  public destroy (): void {
    if (this.destroyed) {
      return
    }

    this.socket.removeStream(this.id)

    this.readable = false
    this.writable = false
    this.socket = null
    this.destroyed = true

    this.destroy = Function.prototype as any
  }
}
