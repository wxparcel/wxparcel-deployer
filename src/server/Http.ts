import path = require('path')
import chalk from 'chalk'
import { IncomingForm } from 'formidable'
import forEach = require('lodash/forEach')
import { ServerOptions } from '../libs/OptionManager'
import DevTool from '../libs/DevTool'
import Connection from '../libs/http/Connection'
import Server from '../libs/http/Server'
import Service from '../libs/Service'
import { ensureDirs, removeFiles, unzip } from '../share/fns'
import { Server as HttpServer, IncomingMessage } from 'http'
import { CommandError, StandardResponse } from '../typings'

export default class HttpService extends Service {
  public options: ServerOptions
  public devTool: DevTool
  public server: Server
  private promises: { [key: string ]: Promise<any> }

  constructor (options: ServerOptions) {
    super()

    this.promises = {}
    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new Server()

    this.server.route('GET', '/status', this.status.bind(this))
    this.server.route('POST', '/upload', this.upload.bind(this))
    this.server.route('GET', '/login', this.login.bind(this))
    this.server.route('GET', '/checkin', this.checkin.bind(this))
  }

  public async start (): Promise<void> {
    const { port } = this.options
    return this.server.listen(port)
  }

  public async status (_: RegExpExecArray, conn: Connection): Promise<void> {
    this.writeJson({ message: 'okaya, server is running.' }, conn)
  }

  public async upload (_: RegExpExecArray, conn: Connection): Promise<void> {
    const { request } = conn
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const { file: uploadFile, uid, appid, version, message, compileType, libVersion, projectname } = await this.transfer(request)
    const log = (message: string) => this.log(message, uid || 'anonymous')
    log(`Upload completed. Version ${chalk.bold(version)} Appid ${chalk.bold(appid)} CompileType ${chalk.bold(compileType)} LibVersion ${chalk.bold(libVersion)} ProjectName ${chalk.bold(projectname)}`)

    const uploadFileName = appid || uid || path.basename(uploadFile).replace(path.extname(uploadFile), '')
    const projFolder = path.join(deployPath, uploadFileName)
    const unzipPromises = await unzip(uploadFile, projFolder)

    unzipPromises.length > 0 && log(`Uncompress file ${chalk.bold(path.basename(uploadFile))}, project folder is ${chalk.bold(path.basename(projFolder))}`)
    this.idle === false && log('Wait for other command execution of the devTool')

    this.pushQueue(...unzipPromises)

    const command = () => {
      log('Start to upload to weixin server')
      return this.devTool.upload(projFolder, version, message)
    }

    const catchError = (error: CommandError) => {
      let { status, message } = this.resolveCommandError(error)

      conn.setStatus(status)
      this.writeJson({ message }, conn)

      return Promise.reject(error)
    }

    await this.execute(command).catch(catchError)
    await removeFiles(uploadFile, projFolder)

    log('Upload completed')
    this.writeJson({ message: 'Upload completed' }, conn)
  }

  public async login (_: RegExpExecArray, conn: Connection): Promise<void> {
    const command = (): Promise<any> => new Promise((resolve) => {
      const completed = (qrcode: Buffer) => {
        this.writeJson({ data: qrcode.toString() }, conn)
        resolve()
      }

      const catchError = (error: CommandError) => {
        let { status, message } = this.resolveCommandError(error)

        conn.setStatus(status)
        this.writeJson({ message }, conn)

        return Promise.reject(error)
      }

      let promise = this.devTool.login(completed).catch(catchError)
      this.promises.login = promise
    })

    await this.execute(command)
  }

  public async checkin (_: RegExpExecArray, conn: Connection): Promise<void> {
    const { request } = conn
    const { login: promise } = this.promises

    if (!(promise instanceof Promise)) {
      this.writeJson({ status: 401, message: 'unlogined' }, conn)
      return
    }

    const remove = () => delete this.promises.login
    request.once('end', remove)

    const completed = () => {
      this.writeJson({ message: 'logined success' }, conn)
    }

    const catchError = (error: CommandError) => {
      let { status, message } = this.resolveCommandError(error)

      conn.setStatus(status)
      this.writeJson({ message }, conn)

      return Promise.reject(error)
    }

    promise.then(completed).catch(catchError)
  }

  public getServer (): HttpServer {
    return this.server.server
  }

  public destory (): void {
    super.destory()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
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

  private writeJson (content: StandardResponse, conn: Connection) {
    let response = this.standard({ status: conn.status, ...content })
    conn.writeJson(response)
  }
}
