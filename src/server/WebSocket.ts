import fs = require('fs-extra')
import path = require('path')
import chalk from 'chalk'
import SocketIO = require('socket.io')
import OptionManager from './OptionManager'
import BaseService from '../libs/Service'
import DevTool from '../libs/DevTool'
import StreamSocket from '../libs/StreamSocket'
import SocketStream from '../libs/SocketStream'
import StdoutServ, { Stdout } from '../services/stdout'
import UserServ from '../services/user'
import { ensureDirs, unzip, removeFiles } from '../share/fns'
import { SocketToken, SocketStreamToken } from '../conf/token'

import { Server as HttpServer } from 'http'
import { Socket as SocketIOSocket, Server as SocketIOServer } from 'socket.io'
import { Socket as SocketIOClientSocket } from 'socket.io-client'
import {
  StandardJSONResponse,
  WebSocketMessage, WebSocketEeventData, WebSocketEevent, WebSocketTunnel,
  CommandError
} from '../typings'

export default class Server extends BaseService {
  public options: OptionManager
  public devTool: DevTool
  public server: SocketIOServer
  public events: Array<WebSocketEevent>

  constructor (options: OptionManager, devTool?: DevTool) {
    super()

    this.options = options
    this.devTool = devTool || new DevTool(this.options)
    this.events = []
  }

  public async start (server?: HttpServer): Promise<void> {
    if (this.server) {
      return Promise.reject(new Error('Server is running'))
    }

    if (server instanceof HttpServer) {
      this.server = SocketIO(server)

    } else {
      const { port } = this.options
      this.server = SocketIO(port)
    }

    this.listen('status', this.status.bind(this))
    this.listen('login', this.login.bind(this))
    this.listen('upload', this.upload.bind(this))
    this.listen('access', this.access.bind(this))

    const onConnection = (socket: SocketIOSocket) => {
      let stdout = StdoutServ.born(socket.id)
      let onMessage = (message: any, stream?: SocketStream) => {
        let { action, token, payload } = message

        let hit = false
        let len = this.events.length
        for (let i = 0; i < len; i ++) {
          let event = this.events[i]
          if (event.type === action) {
            stdout.head('HIT').log(action)

            let datas: WebSocketEeventData = { token, payload, stream }
            event.action(socket, action, datas, stdout)

            hit = true
            break
          }
        }

        hit === false && stdout.head('MISS').log(action)
      }

      let onDisconnect = () => {
        stdout.log('disconnect')

        socket.removeAllListeners()
        streamSocket.destroy()
        stdout.destory()

        socket = undefined
        streamSocket = undefined
        stdout = undefined
        onMessage = undefined
        onDisconnect = undefined
      }

      socket.on(SocketToken, onMessage)
      socket.on('disconnect', onDisconnect)

      let streamSocket = new StreamSocket(socket)
      streamSocket.on(SocketStreamToken, onMessage)

      stdout.log('connect')
    }

    this.server.on('connection', onConnection)
  }

  public async status (tunnel: WebSocketTunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

  public async login (tunnel: WebSocketTunnel): Promise<void> {
    const command = () => {
      const sendQrcode = (qrcode: Buffer) => {
        if (qrcode.byteLength === 0) {
          tunnel.send('qrcode', { status: 500, message: 'Qrcode is not found' })
          return
        }

        tunnel.send('qrcode', { data: qrcode })
      }

      UserServ.logout()
      return this.devTool.login(sendQrcode)
    }

    const catchError = (error) => {
      const { status, message } = this.resolveCommandError(error)
      tunnel.feedback({ status, message })
      return Promise.reject(error)
    }

    const response = await this.execute(command).catch(catchError)
    if (response.status === 'SUCCESS') {
      UserServ.login()
      tunnel.feedback({ message: 'login success' })
      return
    }

    tunnel.feedback({ status: 401, message: JSON.stringify(response) })
  }

  public async upload (tunnel: WebSocketTunnel): Promise<void> {
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const { socket } = tunnel
    const requestData = await this.extract(tunnel)
    tunnel.stdout.log('upload to server completed')

    const { file: uploadFile, version, message } = requestData
    const projFolder = path.join(deployPath, `${socket.id}_${Math.floor(Date.now() / 1000)}`)

    tunnel.stdout.log(`unzip file ${chalk.bold(path.basename(uploadFile))} to ${chalk.bold(path.basename(projFolder))}`)
    await Promise.all(await unzip(uploadFile, projFolder))

    const command = () => {
      tunnel.stdout.log('start deploy to wechat server')
      return this.devTool.upload(projFolder, version, message)
    }

    const catchError = (error: CommandError) => {
      return removeFiles(uploadFile, projFolder).then(() => {
        tunnel.feedback(error)
        return Promise.reject(error)
      })
    }

    await this.execute(command).catch(catchError)
    await removeFiles(uploadFile, projFolder)

    tunnel.feedback({ message: 'deploy complete' })
    tunnel.stdout.log('deploy complete')
  }

  public async access (tunnel: WebSocketTunnel): Promise<void> {
    tunnel.feedback({ message: UserServ.isLogin === true ? 'logined' : 'unlogined' })
  }

  public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>): void {
    const action = async (socket: SocketIOSocket | typeof SocketIOClientSocket, action: string, data: WebSocketEeventData, stdout: Stdout): Promise<any> => {
      const { token, payload, stream } = data
      const send = (action: string, payload: any) => this.feedback(socket, action, token, payload)
      const feedback = this.feedback.bind(this, socket, action, token)
      return listener({ socket, payload, stream, send, feedback, stdout })
    }

    this.events.push({ type, action })
  }

  public feedback (socket: SocketIOSocket | typeof SocketIOClientSocket, action: string, token: string, data: StandardJSONResponse = {}): void {
    const params: WebSocketMessage = {
      action: action,
      token: token,
      payload: this.genStandardResponse(data)
    }

    socket.emit(SocketToken, params)
  }

  private extract (tunnel: WebSocketTunnel): Promise<{ [key: string]: any }> {
    return new Promise((resolve) => {
      const { uploadPath } = this.options
      const { payload, socket, stream } = tunnel

      if (!(stream instanceof SocketStream)) {
        resolve(payload)
        return
      }

      const file = path.join(uploadPath, `${socket.id}_${Date.now()}`)
      fs.ensureFileSync(file)

      stream.on('finish', () => resolve({ ...payload, file }))
      stream.pipe(fs.createWriteStream(file))
    })
  }

  public destroy (): void {
    this.server.close()
    this.devTool.destroy()

    this.server = undefined
    this.devTool = undefined
    this.options = undefined

    this.destroy = Function.prototype as any
  }
}
