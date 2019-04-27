import path = require('path')
import fs = require('fs-extra')
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
import Aider from './Aider'
import { ensureDirs, unzip, removeFiles } from '../share/fns'

import { IncomingMessage } from 'http'
import { CommandError, StandardJSONResponse, Tunnel } from '../typings'

export default class Server extends BaseService {
  public options: OptionManager
  public devTool: DevTool
  public server: HttpServer
  public isLogin: boolean
  public socket: Aider

  get httpServer () {
    return this.server.httpServer
  }

  constructor (options: OptionManager, devTool?: DevTool, server?: HttpServer) {
    super()

    this.options = options
    this.devTool = devTool || new DevTool(this.options)
    this.server = server || new HttpServer()
    this.isLogin = false
  }

  public start (): Promise<void> {
    const { port } = this.options

    this.route('GET', '/status', this.status.bind(this))
    this.route('POST', '/upload', this.upload.bind(this))
    this.route('GET', '/login', this.login.bind(this))
    this.route('GET', '/access', this.access.bind(this))

    return this.server.listen(port)
  }

  public async status (tunnel: Tunnel): Promise<void> {
    tunnel.feedback({ message: 'okaya, server is running.' })
  }

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

    this.execute(command).catch(catchError).then(() => {
      return removeFiles(uploadFile, projFolder)
    })

    tunnel.feedback({ message: 'push deploy task success' })
  }

  public login (tunnel: Tunnel): Promise<void> {
    return new Promise((resolve) => {
      const feedbackQrCode = (qrcode: Buffer) => {
        tunnel.feedback({ data: qrcode })
        resolve()
      }

      const command = async () => {
        const handleSuccess = (response) => {
          if (response.status === 'SUCCESS') {
            this.isLogin = true
            return
          }

          return Promise.reject(new Error('login fail'))
        }

        const catchError = (error: CommandError) => {
          tunnel.feedback(error)
          return Promise.reject(error)
        }

        return this.devTool.login(feedbackQrCode).then(handleSuccess).catch(catchError)
      }

      if (Queue.idle === false) {
        tunnel.stdout.log('wait for other commands')
      }

      this.execute(command)
    })
  }

  public async access (tunnel: Tunnel): Promise<void> {
    tunnel.feedback({ message: this.isLogin === true ? 'logined' : 'unlogined' })
  }

  public async activate (tunnel: Tunnel): Promise<void> {
    const { request, feedback } = tunnel
    const { serverUrl, socketId, projectId } = await this.extract(request)

    this.socket = await this.createAider(projectId, serverUrl, this.devTool)

    const disconnect = () => {
      this.socket = null
    }

    const data = { socketId, projectId }
    this.socket.on('disconnect', disconnect)
    this.socket.send('connectSuccess', { data })

    feedback()
  }

  public async createAider (id: string, server: string, devTool: DevTool) {
    let socket = new Aider(id, this.options, devTool)
    await socket.connect(server)
    return socket
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
