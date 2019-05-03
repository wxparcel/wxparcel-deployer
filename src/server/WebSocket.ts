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

    const connection = (socket: SocketIOSocket) => {
      const stdout = StdoutServ.born(socket.id)
      const onMessage = (message: any, stream?: SocketStream) => {
        let { action, token, payload } = message
        this.events.forEach((event) => {
          if (event.type === action) {
            event.action(socket, action, { token, payload, stream }, stdout)
          }
        })
      }

      socket.on(SocketToken, onMessage)

      const streamSocket = new StreamSocket(socket)
      streamSocket.on(SocketStreamToken, onMessage)
    }

    this.server.on('connection', connection)
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

      return this.devTool.login(sendQrcode)
    }

    const catchError = (error) => {
      const { status, message } = this.resolveCommandError(error)
      tunnel.feedback({ status, message })
      return Promise.reject(error)
    }

    const response = await this.execute(command).catch(catchError)
    if (response.status === 'SUCCESS') {
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

  public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>): void {
    const action = async (socket: SocketIOSocket | typeof SocketIOClientSocket, action: string, data: WebSocketEeventData, stdout: Stdout): Promise<any> => {
      const { token, payload, stream } = data
      const send = this.feedback.bind(this, socket)
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
