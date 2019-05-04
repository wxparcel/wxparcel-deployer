import ip = require('ip')
import fs = require('fs-extra')
import path = require('path')
import shortid = require('shortid')
import SocketIOClient = require('socket.io-client')
import terminalImage = require('terminal-image')
import OptionManager from './OptionManager'
import BaseClient from '../libs/Client'
import StreamSocket from '../libs/StreamSocket'
import { SocketToken, SocketStreamToken } from '../conf/token'

import {
  StandardJSONResponse, CommandError,
  WebSocketMessage
} from '../typings'

export default class Client extends BaseClient {
  public options: OptionManager
  public socket: typeof SocketIOClient.Socket

  constructor (options: OptionManager) {
    super()

    this.options = options
  }

  public async connect (server: string = `${ip.address()}:3000`): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = {
        reconnection: true,
        reconnectionDelay: 3e3,
        reconnectionDelayMax : 5e3,
        reconnectionAttempts: 10
      }

      this.socket = SocketIOClient(server, params)
      const disconnect = () => this.destroy()

      this.socket.on('connect', resolve)
      this.socket.on('connect_error', reject)
      this.socket.on('disconnect', disconnect)
    })
  }

  public status (): Promise<any> {
    return this.send('status')
  }

  public login (receiveQrcode: (image: string) => any): Promise<any> {
    return new Promise((resolve, reject) => {
      const qrcode = async (response: StandardJSONResponse) => {
        if (response.status !== 200) {
          return reject(new Error(response.message))
        }

        const qrcode: Buffer = response.data
        const regexp = /^data:image\/([\w+]+);base64,([\s\S]+)/
        const base64 = qrcode.toString()
        const match = regexp.exec(base64)

        if (match) {
          const content = match[2]
          const buffer = Buffer.from(content, 'base64')
          const image = await terminalImage.buffer(buffer)
          receiveQrcode(image)
          return
        }

        return reject(new Error('Qrcode is invalid'))
      }

      const token = shortid()
      this.once('qrcode', qrcode, token)
      this.send('login', null, token).then(resolve).catch(reject)
    })
  }

  public upload (folder: string, version: string, message: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const { releasePath } = this.options
      const repoUrl = await this.getGitRepo(folder)
      const getLog = await this.getGitMessage(folder)
      const [gitUser, gitEmail, gitDatetime, gitHash, gitMessage] = getLog.split('\n')
      const { appid, compileType, libVersion, projectname } = await this.getProjectConfig(folder)
      const zipFile = path.join(releasePath, `${Date.now()}.zip`)

      await this.compress(folder, zipFile)

      const datas = {
        repoUrl,
        gitUser: gitUser || '',
        gitEmail: gitEmail || '',
        gitMessage: gitMessage || '',
        gitHash: gitHash || '',
        gitDatetime: gitDatetime || new Date() + '',
        appid,
        version,
        message: message || gitMessage,
        compileType,
        libVersion,
        projectname: decodeURIComponent(projectname)
      }

      const upload = (response: StandardJSONResponse) => {
        const handleSuccess = () => {
          fs.removeSync(zipFile)
          resolve(response)
        }

        const catchError = (error: CommandError) => {
          fs.removeSync(zipFile)
          reject(error)
        }

        this.resolveResponse(response).then(handleSuccess).catch(catchError)
      }

      const socket = new StreamSocket(this.socket)
      const socketStream = socket.createStream()

      const action = 'upload'
      const payload = datas

      const token = shortid()
      this.once('upload', upload, token)
      socket.emit(SocketStreamToken, socketStream, { action, token, payload })

      const readStream = fs.createReadStream(zipFile)
      readStream.pipe(socketStream)
    })
  }

  public access (): Promise<any> {
    return this.send('access')
  }

  public send (type: string, payload: any = null, token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const callback = (response: StandardJSONResponse) => {
        this.resolveResponse(response).then(resolve, reject)
      }

      this.emit(type, payload, callback, token)
    })
  }

  public emit (action: string, payload: any = null, callback: (response: StandardJSONResponse) => void, token: string = shortid()): void {
    typeof callback === 'function' && this.once(action, callback, token)
    this.socket.emit(SocketToken, { action, token, payload })
  }

  public once (action: string, callback: (response: StandardJSONResponse) => void, token: string): void {
    const feedback = (response: WebSocketMessage) => {
      const { action: feedbackAction, token: feedbackToken, payload } = response
      if (action === feedbackAction && token === feedbackToken) {
        callback(payload as StandardJSONResponse)
        this.socket.off(SocketToken, feedback)
      }
    }

    this.socket.on(SocketToken, feedback)
  }

  private resolveResponse (response: StandardJSONResponse): Promise<any> {
    const { status, code, message } = response
    if (200 <= status && status < 400 && code === 0) {
      return Promise.resolve(response)
    }

    let error = new Error(message)
    return Promise.reject(error)
  }

  public destroy (): void {
    this.socket.removeAllListeners()
    this.socket.close()

    this.options = undefined
    this.socket = undefined

    this.destroy = Function.prototype as any
  }
}
