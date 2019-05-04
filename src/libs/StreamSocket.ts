import forEach = require('lodash/forEach')
import shortid = require('shortid')
import SocketIO = require('socket.io')
import SocketIOClient = require('socket.io-client')
import SocketStream from './SocketStream'

export default class StreamSocket {
  static TOKEN: string = '$socket-stream'
  private socket: SocketIO.Socket | typeof SocketIOClient.Socket
  private streams: { [key: string]: SocketStream }

  constructor (socket: SocketIO.Socket | typeof SocketIOClient.Socket) {
    this.socket = socket
    this.streams = {}

    this.socket.on('disconnect', this.onDisconnect.bind(this))
    this.socket.on('error', this.onError.bind(this))

    this.listen(`${StreamSocket.TOKEN}-connect`, this.onconnect.bind(this))
    this.listen(`${StreamSocket.TOKEN}-read`, this.onread.bind(this))
    this.listen(`${StreamSocket.TOKEN}-write`, this.onwrite.bind(this))
    this.listen(`${StreamSocket.TOKEN}-finish`, this.onfinish.bind(this))
    this.listen(`${StreamSocket.TOKEN}-end`, this.onend.bind(this))
    this.listen(`${StreamSocket.TOKEN}-error`, this.onerror.bind(this))
  }

  public createStream (id: string = shortid()): SocketStream {
    const stream = new SocketStream(id, this)
    this.streams[id] = stream

    this.send(`${StreamSocket.TOKEN}-connect`, { id })
    return stream
  }

  public read (id: string, size: number): void {
    this.send(`${StreamSocket.TOKEN}-read`, { id, size })
  }

  public write (id: string, chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.send(`${StreamSocket.TOKEN}-write`, { id, chunk, encoding }, callback)
  }

  public end (id: string): void {
    this.send(`${StreamSocket.TOKEN}-end`, { id })
  }

  public error (id: string, error: string): void {
    this.send(`${StreamSocket.TOKEN}-error`, { id, error })
  }

  private onDisconnect (): void {
    this.destroy()
  }

  private onError (): void {
    console.log(arguments)
  }

  private onconnect (payload: any): void {
    const id: string = payload.id

    const stream = new SocketStream(id, this)
    this.streams[id] = stream
  }

  private onread (payload: any): void {
    const id: string = payload.id
    const stream = this.streams[id]
    stream._onread()
  }

  private onwrite (payload: any, feedback: (error: Error | null) => void): void {
    // console.log('onWrite', Date.now(), payload)

    const id: string = payload.id
    const chunk: any = payload.chunk
    const encoding: string = payload.encoding

    const stream = this.streams[id]
    stream._onwrite(chunk, encoding, feedback)
  }

  private onfinish (payload: any): void {
    const id: string = payload.id

    const stream = this.streams[id]
    stream._onfinish()
  }

  private onend (payload: any): void {
    const id: string = payload.id

    const stream = this.streams[id]
    stream._onend()
  }

  private onerror (payload: any) {
    const id: string = payload.id
    const error: Error = payload.error

    const stream = this.streams[id]
    stream._onerror(error)
  }

  private send (type: string, payload: any = null, callback?: (error: Error | null, payload: any) => void): void {
    const id = shortid()

    if (typeof callback === 'function') {
      const onMessage = (feedbackId: string, error: string | null, payload: any) => {
        if (feedbackId === id) {
          let exception = error ? new Error(error) : null
          callback(exception, payload)
        }
      }

      this.socket.once(`${type}-feeback`, onMessage)
    }

    this.socket.emit(`${type}-send`, id, payload)
  }

  private listen (type: string, handle: (payload: any, feedback: (error: Error | null, payload: any) => void) => void) {
    const onMessage = (id: string, payload: any = null) => {
      const feedback = (error: Error | null, payload: any = null) => {
        this.socket.emit(`${type}-feeback`, id, error === null ? null : error.message, payload)
      }

      handle(payload, feedback)
    }

    this.socket.on(`${type}-send`, onMessage)
  }

  public emit (type: string, stream: SocketStream, data?: any): this {
    this.socket.emit(type, stream.id, data)
    return this
  }

  public on (type: string, callback: (...args: Array<any>) => void): this {
    const onMessage = (id: string, data: any) => {
      const stream = this.streams[id]
      callback(data, stream)
    }

    this.socket.on(type, onMessage)
    return this
  }

  public removeStream (id) {
    delete this.streams[id]
  }

  public destroy (): void {
    forEach(this.streams, (stream) => stream.destroy())

    this.streams = undefined

    this.destroy = Function.prototype as any
  }
}
