import ip = require('ip')
import fs = require('fs-extra')
import path = require('path')
import SocketIOClient = require('socket.io-client')
import SocketIOStream = require('socket.io-stream')
import terminalImage = require('terminal-image')
import OptionManager from './OptionManager'
import BaseClient from '../libs/Client'
import { StandardJSONResponse, CommandError } from '../typings'

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

  public login (receiveQrcode: (image: string) => any): Promise<any> {
    return new Promise((resolve, reject) => {
      const qrcode = async (qrcode: Buffer) => {
        let regexp = /^data:image\/([\w+]+);base64,([\s\S]+)/
        let base64 = qrcode.toString()
        let match = regexp.exec(base64)

        if (match) {
          let content = match[2]
          let buffer = Buffer.from(content, 'base64')
          let image = await terminalImage.buffer(buffer)
          receiveQrcode(image)
        }

        return Promise.reject(new Error('Qrcode is invalid'))
      }

      const login = (response: StandardJSONResponse) => {
        this.resolveResponse(response).then(resolve).catch(reject)
      }

      this.socket.once('qrcode', qrcode)
      this.socket.once('login', login)
      this.socket.send('login')
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
          resolve()
        }

        const catchError = (error: CommandError) => {
          fs.removeSync(zipFile)
          reject(error)
        }

        this.resolveResponse(response).then(handleSuccess).catch(catchError)
      }

      this.socket.once('upload', upload)

      const stream = SocketIOStream.createStream()
      const end = () => stream.close()
      stream.once('end', end)

      SocketIOStream(this.socket).emit('upload', stream, datas)
      SocketIOStream.createBlobReadStream(zipFile).pipe(stream)
    })
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
