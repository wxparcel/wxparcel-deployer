import path = require('path')
import chalk from 'chalk'
import { IncomingForm } from 'formidable'
import forEach = require('lodash/forEach')
import { ServerOptions } from '../libs/OptionManager'
import DevTool from '../libs/DevTool'
import Connection from '../libs/http/Connection'
import Server from '../libs/http/Server'
import Service from '../libs/Service'
import StdoutServ from '../services/stdout'
import { ensureDirs, removeFiles, unzip, killProcess } from '../share/fns'
import { Server as HttpServer, IncomingMessage } from 'http'
import { CommandError, StandardResponse, HttpServerTunnel } from '../typings'

export default class HttpService extends Service {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server
  private promises: { [key: string ]: Promise<any> }
  private tokens: { [key: string]: symbol }

  constructor (options: ServerOptions) {
    super()

    this.promises = {}
    this.tokens = {}
    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new Server()
  }

  public async start (): Promise<void> {
    const { port } = this.options

    this.route('GET', '/status', this.status.bind(this))
    this.route('POST', '/upload', this.upload.bind(this))
    this.route('GET', '/login', this.login.bind(this))
    this.route('GET', '/checkin', this.checkin.bind(this))

    return this.server.listen(port)
  }

  public async status (tunnel: HttpServerTunnel): Promise<void> {
    const { feedback } = tunnel
    feedback({ message: 'okaya, server is running.' })
  }

  public async upload (tunnel: HttpServerTunnel): Promise<void> {
    const { conn, feedback } = tunnel
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const { request } = conn
    const requestData = await this.transfer(request)
    const { file: uploadFile, appid, version, message } = requestData
    const log = (message: string) => this.log(message, appid)
    log('Upload completed.')

    const uploadFileName = appid || path.basename(uploadFile).replace(path.extname(uploadFile), '')
    const projFolder = path.join(deployPath, uploadFileName)
    const unzipPromises = await unzip(uploadFile, projFolder)

    unzipPromises.length > 0 && log(`Uncompress file ${chalk.bold(path.basename(uploadFile))}, project folder is ${chalk.bold(path.basename(projFolder))}`)
    this.idle === false && log('Wait for other command execution of the devTool')

    this.pushQueue(...unzipPromises)

    const command = (killToken: symbol) => {
      log('Start to upload to weixin server')
      return this.devTool.upload(projFolder, version, message, killToken)
    }

    let retryTimes = 0
    const catchError = (error: CommandError) => {
      if (retryTimes ++ <= 3) {
        log('Retry upload to weixin server')
        return this.devTool.quit().then(() => this.execute(command).catch(catchError))
      }

      let { status, message } = this.resolveCommandError(error)
      conn.setStatus(status)
      feedback({ message })

      return Promise.reject(error)
    }

    await this.execute(command).catch(catchError)
    await removeFiles(uploadFile, projFolder)

    log('Upload completed')
    feedback({ message: 'Upload completed' })
  }

  public async login (tunnel: HttpServerTunnel): Promise<void> {
    const { conn, feedback } = tunnel

    const command = (killToken: symbol): Promise<any> => new Promise((resolve) => {
      const feedbackQrCode = (qrcode: Buffer) => {
        feedback({ data: qrcode })
        resolve()
      }

      const catchError = (error: CommandError) => {
        let { status, message } = this.resolveCommandError(error)

        conn.setStatus(status)
        feedback({ message })

        return Promise.reject(error)
      }

      let promise = this.devTool.login(feedbackQrCode, killToken).catch(catchError)
      this.promises.login = promise.catch((error) => {
        StdoutServ.error(error)
      })

      this.tokens.login = killToken
    })

    const { login: killToken } = this.tokens
    killToken && killProcess(killToken)

    this.tokens.login = null
    this.promises.login = null

    await this.execute(command)
  }

  public async checkin (tunnel: HttpServerTunnel): Promise<void> {
    const { conn, feedback } = tunnel
    const { request } = conn
    const { login: promise } = this.promises

    if (!(promise instanceof Promise)) {
      feedback({ status: 401, message: 'unlogined' })
      return
    }

    const remove = () => delete this.promises.login
    request.once('end', remove)

    const completed = () => {
      feedback({ message: 'logined success' })
    }

    const catchError = (error: CommandError) => {
      let { status, message } = this.resolveCommandError(error)

      conn.setStatus(status)
      feedback({ message })

      return Promise.reject(error)
    }

    promise.then(completed).catch(catchError)
  }

  public route (methods: string | Array<string>, path: string, handle: (tunnel: HttpServerTunnel) => Promise<void>) {
    const router = async (params: RegExpExecArray, conn: Connection) => {
      const feedback = this.feedback.bind(this, conn)
      const log = (message: string) => this.log(message)

      await handle({ params, conn, feedback, log }).catch((error) => {
        return Promise.reject(error)
      })
    }

    this.server.route(methods, path, router)
  }

  public getServer (): HttpServer {
    return this.server.server
  }

  private transfer (request: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const { uploadPath } = this.options
      const form = new IncomingForm()
      const formData = {}

      form.uploadDir = uploadPath

      form.parse(request, (error, fields, _files) => {
        if (error) {
          reject(error)
          return
        }

        let files = {}
        forEach(_files, (file, name) => {
          files[name] = file.path
        })

        Object.assign(formData, fields, files)
      })

      form.on('end', () => resolve(formData))
    })
  }

  private feedback (conn: Connection, content: StandardResponse) {
    let response = this.standard({ status: conn.status, ...content })
    conn.writeJson(response)
  }

  public destroy (): void {
    super.destroy()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }
}
