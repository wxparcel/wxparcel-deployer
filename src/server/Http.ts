import path = require('path')
import forEach = require('lodash/forEach')
import { IncomingForm } from 'formidable'
import DevTool from '../libs/DevTool'
import HttpServer from '../libs/Server'
import BaseService from '../libs/Service'
import Connection from '../libs/Connection'
import OptionManager from './OptionManager'
import Queue from '../services/queue'
import { ensureDirs, unzip, removeFiles, killProcess } from '../share/fns'

import { IncomingMessage } from 'http'
import { CommandError, StandardJSONResponse, Tunnel } from '../typings'

export default class Server extends BaseService {
  private options: OptionManager
  private server: HttpServer
  private devTool: DevTool
  private promises: { [key: string ]: Promise<any> }
  private tokens: { [key: string]: symbol }

  get httpServer () {
    return this.server.server
  }

  constructor (options: OptionManager, devTool?: DevTool, server?: HttpServer) {
    super()

    this.options = options
    this.devTool = devTool || new DevTool(this.options)
    this.server = server || new HttpServer()
    this.promises = {}
    this.tokens = {}
  }

  public start (): Promise<void> {
    const { port } = this.options

    this.route('GET', '/status', this.status.bind(this))
    this.route('POST', '/upload', this.upload.bind(this))
    this.route('GET', '/login', this.login.bind(this))
    this.route('GET', '/checkin', this.checkin.bind(this))

    return this.server.listen(port)
  }

  public async status (tunnel: Tunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

  public async upload (tunnel: Tunnel): Promise<void> {
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const requestData = await this.extract(tunnel.request)
    const { file: uploadFile, appid, version, message } = requestData
    const uploadFileName = appid || path.basename(uploadFile).replace(path.extname(uploadFile), '')
    const projFolder = path.join(deployPath, uploadFileName)

    const unzipPromises = await unzip(uploadFile, projFolder)
    Queue.push(...unzipPromises)

    const command = (killToken: symbol) => {
      return this.devTool.upload(projFolder, version, message, killToken)
    }

    let retryTimes = 0
    const catchError = (error: CommandError) => {
      if (retryTimes ++ <= 3) {
        return this.devTool.quit().then(() => {
          return this.execute(command).catch(catchError)
        })
      }

      tunnel.feedback(error)
      return Promise.reject(error)
    }

    await this.execute(command).catch(catchError)
    await removeFiles(uploadFile, projFolder)

    tunnel.feedback({ message: 'Upload completed' })
  }

  public async login (tunnel: Tunnel): Promise<void> {
    const command = (killToken: symbol): Promise<any> => new Promise((resolve) => {
      const feedbackQrCode = (qrcode: Buffer) => {
        tunnel.feedback({ data: qrcode })
        resolve()
      }

      const catchError = (error: CommandError) => {
        tunnel.feedback(error)
        return Promise.reject(error)
      }

      this.promises.login = this.devTool.login(feedbackQrCode, killToken).catch(catchError)
      this.tokens.login = killToken
    })

    const { login: killToken } = this.tokens
    killToken && killProcess(killToken)

    this.tokens.login = null
    this.promises.login = null

    await this.execute(command)
  }

  public async checkin (tunnel: Tunnel): Promise<void> {
    const { login: promise } = this.promises

    if (!(promise instanceof Promise)) {
      tunnel.feedback({ status: 401, message: 'unlogined' })
      return
    }

    const remove = () => {
      delete this.promises.login
    }

    tunnel.request.once('end', remove)

    const completed = () => {
      tunnel.feedback({ message: 'logined success' })
    }

    const catchError = (error: CommandError) => {
      tunnel.feedback(error)
      return Promise.reject(error)
    }

    promise.then(completed).catch(catchError)
  }

  public route (methods: string | Array<string>, path: string, handle: (tunnel: Tunnel) => Promise<void>) {
    const router = (params: RegExpExecArray, connection: Connection) => {
      let tunnel = connection as Tunnel
      tunnel.params = params
      tunnel.feedback = this.feedback.bind(this, connection)

      return handle(tunnel)
    }

    this.server.route(methods, path, router)
  }

  private extract (request: IncomingMessage): Promise<{ [key: string]: any }> {
    return new Promise((resolve, reject) => {
      const { uploadPath } = this.options
      const form = new IncomingForm()
      const formData = {}

      const handleParse = (error, fields, files) => {
        if (error) {
          reject(error)
          return
        }

        let resultFiles = {}
        forEach(files, (file, name) => resultFiles[name] = file.path)
        Object.assign(formData, fields, resultFiles)
      }

      form.uploadDir = uploadPath
      form.parse(request, handleParse)
      form.on('end', () => resolve(formData))
    })
  }

  private feedback (connection: Connection, content: StandardJSONResponse | CommandError) {
    function isCommandError (content: StandardJSONResponse | CommandError): content is CommandError {
      return 'code' in content
    }

    if (isCommandError(content)) {
      let { status, message } = this.resolveCommandError(content)
      let data = this.genStandardResponse({ status, message })
      connection.endJson(data)
    } else {
      let status = connection.status
      let data = this.genStandardResponse({ status, ...content })
      connection.endJson(data)
    }
  }

  public destroy (): void {
    super.destroy()

    this.server.close()
    this.devTool.destroy()

    this.server = undefined
    this.devTool = undefined
    this.options = undefined

    this.destroy = Function.prototype as any
  }
}
