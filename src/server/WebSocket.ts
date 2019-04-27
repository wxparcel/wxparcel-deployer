import fs = require('fs-extra')
import path = require('path')
import chalk from 'chalk'
import SocketIO = require('socket.io')
import SocketIOStream = require('socket.io-stream')
import OptionManager from './OptionManager'
import BaseService from '../libs/Service'
import DevTool from '../libs/DevTool'
import StdoutServ, { Stdout } from '../services/stdout'
import { ensureDirs, unzip, removeFiles } from '../share/fns'

import { ReadStream } from 'fs-extra'
import { Server as HttpServer } from 'http'
import { Socket as SocketIOSocket, Server as SocketIOServer } from 'socket.io'
import { Socket as SocketIOClientSocket } from 'socket.io-client'
import {
  StandardJSONResponse,
  WebSocketMessage, WebSocketEevent, WebSocketPayload, WebSocketTunnel,
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

    const connection = (socket: SocketIOSocket) => {
      const stdout = StdoutServ.born(socket.id)
      const onMessage = (message: any, stream?: ReadStream) => {
        const { action, payload } = message

        const normalEvents = []
        const streamEvents = []

        this.events.forEach((event) => {
          event.stream ? streamEvents.push(event) : normalEvents.push(event)
        })

        if (stream) {
          streamEvents.forEach((event) => {
            if (event.type === action) {
              payload.stream = stream
              event.action(socket, action, payload, stdout)
            }
          })
        } else {
          normalEvents.forEach((event) => {
            if (event.type === action) {
              event.action(socket, action, payload, stdout)
            }
          })
        }
      }

      socket.on('deploy', onMessage)
      SocketIOStream(socket).on('deploy', onMessage)
    }

    this.listen('status', this.status.bind(this))
    this.listen('login', this.login.bind(this))
    this.listen('upload', this.upload.bind(this), true)

    this.server.on('connection', connection)
  }

  public async status (tunnel: WebSocketTunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

  public async login (tunnel: WebSocketTunnel): Promise<void> {
    const command = () => {
      const sendQrcode = (qrcode: Buffer) => {
        if (qrcode.byteLength === 0) {
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

    return this.execute(command).catch(catchError)
  }

  public async upload (tunnel: WebSocketTunnel): Promise<void> {
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const { socket, payload } = tunnel
    const requestData = await this.extract(payload.stream)
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
  }

  public listen (type: string, listener: (tunnel: WebSocketTunnel) => Promise<any>, stream: boolean = false): void {
    const action = async (socket: SocketIOSocket | typeof SocketIOClientSocket, action: string, payload: WebSocketPayload, stdout: Stdout): Promise<any> => {
      const send = this.feedback.bind(this, socket)
      const feedback = this.feedback.bind(this, socket, action)
      return listener({ socket, payload, send, feedback, stdout })
    }

    this.events.push({ type, action, stream })
  }

  public feedback (socket: SocketIOSocket | typeof SocketIOClientSocket, type: string, data: StandardJSONResponse = {}): void {
    const params: WebSocketMessage = {
      action: type,
      payload: this.genStandardResponse(data)
    }

    socket.emit('deploy', params)
  }

  private extract (tunnel: WebSocketTunnel): Promise<{ [key: string]: any }> {
    return new Promise((resolve) => {
      const { uploadPath } = this.options
      const { payload, socket } = tunnel
      const { stream, ...others } = payload

      const file = path.join(uploadPath, `${socket.id}_${Date.now()}`)
      fs.ensureFileSync(file)

      const end = () => resolve({ ...others, file })
      stream.on('end', end)
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
