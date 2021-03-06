import path = require('path')
import forEach = require('lodash/forEach')
import { IncomingForm } from 'formidable'
import chalk from 'chalk'
import DevTool from '../libs/DevTool'
import HttpServer from '../libs/Server'
import BaseService from '../libs/Service'
import Connection from '../libs/Connection'
import OptionManager from './OptionManager'
import Queue from '../services/queue'
import { Stdout } from '../services/stdout'
import UserServ from '../services/user'
import { Access } from '../decorators/route'
import Aider from './Aider'
import { ensureDirs, unzip, removeFiles } from '../share/fns'

import { IncomingMessage } from 'http'
import { CommandError, StandardJSONResponse, Tunnel } from '../typings'

export default class Server extends BaseService {
  public options: OptionManager
  public devTool: DevTool
  public server: HttpServer
  public aider: Aider

  get httpServer () {
    return this.server.httpServer
  }

  constructor (options: OptionManager, devTool?: DevTool, server?: HttpServer) {
    super()

    this.options = options
    this.devTool = devTool || new DevTool(this.options)
    this.server = server || new HttpServer()
  }

  public start (): Promise<void> {
    const { port } = this.options

    this.route('GET', '/status', this.status.bind(this))
    this.route('POST', '/upload', this.upload.bind(this))
    this.route('GET', '/login', this.login.bind(this))
    this.route('GET', '/access', this.access.bind(this))
    this.route('POST', '/rely', this.rely.bind(this))

    return this.server.listen(port)
  }

  public async status (tunnel: Tunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

  @Access
  public async upload (tunnel: Tunnel): Promise<void> {
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const requestData = await this.extract(tunnel.request)
    tunnel.stdout.log('upload to server completed')

    const { file: uploadFile, version, message } = requestData
    const projFolder = path.join(deployPath, `${tunnel.id}_${Math.floor(Date.now() / 1000)}`)

    tunnel.stdout.log(`unzip file ${chalk.bold(path.basename(uploadFile))} to ${chalk.bold(path.basename(projFolder))}`)
    await Promise.all(await unzip(uploadFile, projFolder))

    const command = async () => {
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

  public login (tunnel: Tunnel): Promise<void> {
    return new Promise((resolve, reject) => {
      const feedbackQrCode = (qrcode: Buffer) => {
        if (qrcode.byteLength > 0) {
          tunnel.feedback({ data: qrcode })
          resolve()

        } else {
          let error = new Error('QRCode is empty')
          tunnel.feedback({ status: 500, message: error.message })
          reject(error)
        }
      }

      const command = async () => {
        const handleSuccess = (response) => {
          if (response.status === 'SUCCESS') {
            UserServ.login()
            return
          }

          return Promise.reject(new Error('login fail'))
        }

        const catchError = (error: CommandError) => {
          tunnel.feedback(error)
          return Promise.reject(error)
        }

        UserServ.logout()
        return this.devTool.login(feedbackQrCode).then(handleSuccess).catch(catchError)
      }

      if (Queue.idle === false) {
        tunnel.stdout.log('wait for other commands')
      }

      this.execute(command)
    })
  }

  public async access (tunnel: Tunnel): Promise<void> {
    tunnel.feedback({ message: UserServ.isLogin === true ? 'logined' : 'unlogined' })
  }

  public async rely (tunnel: Tunnel): Promise<void> {
    const { request, feedback } = tunnel
    const { serverUrl, socketId, projectId } = await this.extract(request)

    this.aider = new Aider(projectId, this.options, this.devTool)
    await this.aider.connect(serverUrl)

    let disconnect = () => {
      this.aider.destroy()
      this.aider = null
      disconnect = undefined
    }

    const data = { socketId, projectId }
    this.aider.socket.on('disconnect', disconnect)
    this.aider.send('connectSuccess', { data })

    feedback()
  }

  public route (methods: string | Array<string>, path: string, handle: (tunnel: Tunnel) => Promise<void>) {
    const router = (params: RegExpExecArray, connection: Connection, stdout: Stdout) => {
      let tunnel = connection as Tunnel
      tunnel.params = params
      tunnel.stdout = stdout
      tunnel.feedback = this.feedback.bind(this, connection)

      return handle(tunnel)
    }

    this.server.route(methods, path, router)
  }

  public extract (request: IncomingMessage): Promise<{ [key: string]: any }> {
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

  public feedback (connection: Connection, content: StandardJSONResponse | CommandError) {
    function isCommandError (content: StandardJSONResponse | CommandError): content is CommandError {
      return 'code' in content
    }

    if (isCommandError(content)) {
      let { status, message } = this.resolveCommandError(content)
      let data = this.genStandardResponse({ status, message })
      connection.end(data)

    } else {
      let status = connection.status
      let data = this.genStandardResponse({ status, ...content })
      connection.end(data)
    }
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
