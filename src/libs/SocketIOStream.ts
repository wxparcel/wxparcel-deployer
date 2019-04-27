// import { Duplex } from 'stream'
// import forEach = require('lodash/forEach')
// import SocketIO = require('socket.io')
// import SocketIOClient = require('socket.io-client')

// class SocketStream extends Duplex {
//   constructor () {
//     super()
//   }

//   public read () {

//   }
// }

// let q = new SocketStream()
// q.pipe(q)

// export default class Socket {
//   private socket: SocketIO.Socket | typeof SocketIOClient.Socket
//   private streams: { [key: string]: Array<Buffer> }

//   constructor (socket: SocketIO.Socket | typeof SocketIOClient.Socket) {
//     this.streams = {}

//     socket.on('$socket-stream', this.onStream.bind(this))
//     socket.on('$socket-stream-read', this.onRead.bind(this))
//     socket.on('$socket-stream-write', this.onWrite.bind(this))
//     socket.on('$socket-stream-end', this.onEnd.bind(this))
//     socket.on('$socket-stream-error', this.onError.bind(this))
//     socket.on('error', this.onError.bind(this))
//     socket.on('disconnect', this.onDisconnect.bind(this))

//     this.socket = socket
//   }

//   private onStream (id: string) {
//     this.streams[id] = []
//   }

//   private onRead (id: string) {
//     let stream = this.streams[id]
//   }

//   private onWrite (id: string, chunk: ArrayBuffer) {
//     chunk = new Buffer(new Uint8Array(chunk))

//     let stream = this.streams[id]
//   }

//   private onEnd (id: string) {
//     let stream = this.streams[id]
//   }

//   private onError (id: string, message: string) {
//     let stream = this.streams[id]
//     let error = new Error(message)
//   }

//   private onDisconnect (id: string) {
//     forEach(this.streams, (stream) => {
//       // stream.destroy()
//       // stream.emit('close')
//       // stream.emit('error', new Error('Connection aborted'))
//     })
//   }
// }
