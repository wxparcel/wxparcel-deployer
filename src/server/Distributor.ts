// import SocketIO = require('socket.io-client')
// import forEach = require('lodash/forEach')
// import { IncomingForm } from 'formidable'
// import { ServerOptions } from '../libs/OptionManager'
// import HttpServer from '../libs/http/Server'
// import Connection from '../libs/http/Connection'
// import DevTool from '../libs/DevTool'
// import Service from '../libs/Service'
// import WebSocketService from './WebSocket'
// import HttpService from './Http'
// import { IncomingMessage } from 'http'
// import { Socket } from 'socket.io-client'
// import {
//   WebSocketEevent,
//   WebSocketRequestMessage,
//   WebSocketResponseMessage,
//   StandardResponse,
//   HttpServerTunnel,
//   WebSocketTunnel
// } from '../typings'

// export class SocketClient extends Service {
//   private id: string
//   private options: ServerOptions
//   private devTool: DevTool
//   private events: Array<WebSocketEevent>
//   private socket: typeof Socket

//   constructor (id: string, options: ServerOptions, devTool: DevTool) {
//     super()

//     this.id = id
//     this.options = options
//     this.devTool = devTool
//     this.events = []
//   }

//   public status = WebSocketService.prototype.status
//   public login = WebSocketService.prototype.login

//   public start (url: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//       const params = {
//         reconnection: true,
//         reconnectionDelay: 1e3,
//         reconnectionDelayMax : 5e3,
//         reconnectionAttempts: 0
//       }

//       this.socket = SocketIO(url, params)

//       this.listen('checkStatus', this.status.bind(this))
//       this.listen('login', this.login.bind(this))

//       const connection = () => {
//         const onMessage = (message: WebSocketRequestMessage) => {
//           const { action, payload } = message
//           this.events.forEach((event) => {
//             if (event.type === action) {
//               event.action(this.socket, action, payload)
//             }
//           })
//         }

//         this.socket.on('deploy', onMessage)
//         resolve()
//       }

//       const disconnect = () => this.destroy()

//       this.socket.on('connect', connection)
//       this.socket.on('connect_error', reject)
//       this.socket.on('disconnect', disconnect)
//     })
//   }

//   public on (type: string, fn: Function) {
//     this.socket.on(type, fn)
//   }

//   public send (type: string, data: StandardResponse = {}) {
//     const params: WebSocketResponseMessage = {
//       action: type,
//       payload: this.standard(data)
//     }

//     this.socket.emit('deploy', params)
//   }

//   public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>): void {
//     const action = async (socket: typeof Socket, action: string, payload: any): Promise<any> => {
//       const feedback = this.feedback.bind(this, socket, action)
//       const log = (message: string) => this.log(message, this.id)
//       return listener({ payload, feedback, socket, log })
//     }

//     this.events.push({ type, action })
//   }

//   private feedback (socket: typeof Socket, type: string, data: StandardResponse = {}): void {
//     const params: WebSocketResponseMessage = {
//       action: type,
//       payload: this.standard(data)
//     }

//     socket.emit('deploy', params)
//   }

//   public destroy (): void {
//     this.destroy = Function.prototype as any

//     super.destroy()

//     this.socket.disconnect()
//     this.socket.removeAllListeners()
//     this.socket.close()

//     this.devTool = undefined
//     this.options = undefined
//     this.socket = undefined
//   }
// }

// export default class Distributor extends Service {
//   private options: ServerOptions
//   private server: HttpServer
//   private devTool: DevTool
//   private socket: SocketClient

//   constructor (options: ServerOptions) {
//     super()

//     this.options = options
//     this.server = new HttpServer()
//     this.devTool = new DevTool(this.options)
//   }

//   public async start (): Promise<void> {
//     const { port } = this.options
//     this.route('POST', '/connect', this.connect.bind(this))
//     this.route('POST', '/upload', this.upload.bind(this))
//     return this.server.listen(port)
//   }

//   public async connect (tunnel: HttpServerTunnel): Promise<void> {
//     const { conn, feedback } = tunnel
//     const { request } = conn
//     const { serverUrl, socketId, projectId } = await this.transfer(request)

//     this.socket && this.socket.destroy()

//     const log = (message: string) => this.log(message, projectId)
//     this.socket = await this.createSocket(projectId, serverUrl, this.devTool)
//     log(`Socket connected successfully`)

//     const disconnect = () => {
//       this.socket = null
//       log(`Socket has been disconnected and destroyed`)
//     }

//     const data = { socketId, projectId }
//     this.socket.on('disconnect', disconnect)
//     this.socket.send('connectSuccess', { data })

//     feedback()
//   }

//   public upload = HttpService.prototype.upload

//   private async createSocket (id: string, url: string, devTool: DevTool) {
//     let socket = new SocketClient(id, this.options, devTool)
//     await socket.start(url)
//     return socket
//   }

//   public route (methods: string | Array<string>, path: string, handle: (tunnel: HttpServerTunnel) => Promise<void>) {
//     const router = async (params: RegExpExecArray, conn: Connection) => {
//       const feedback = this.feedback.bind(this, conn)
//       const log = (message: string) => this.log(message)

//       await handle({ params, conn, feedback, log })
//     }

//     this.server.route(methods, path, router)
//   }

//   private transfer (request: IncomingMessage): Promise<any> {
//     return new Promise((resolve, reject) => {
//       const { uploadPath } = this.options
//       const form = new IncomingForm()
//       const formData = {}

//       form.uploadDir = uploadPath

//       form.parse(request, (error, fields, _files) => {
//         if (error) {
//           reject(error)
//           return
//         }

//         let files = {}
//         forEach(_files, (file, name) => {
//           files[name] = file.path
//         })

//         Object.assign(formData, fields, files)
//       })

//       form.on('end', () => resolve(formData))
//     })
//   }

//   private feedback (conn: Connection, content: StandardResponse) {
//     let response = this.standard({ status: conn.status, ...content })
//     conn.writeJson(response)
//   }

//   public destroy () {
//     this.server.destroy()

//     this.options = undefined
//     this.server = undefined
//     this.socket = undefined
//   }
// }
