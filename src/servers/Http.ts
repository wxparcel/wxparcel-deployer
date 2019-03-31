import path = require('path')
import chalk from 'chalk'
import { IncomingForm } from 'formidable'
import forEach = require('lodash/forEach')
import { ServerOptions } from '../libs/OptionManager'
import DevTool from '../libs/DevTool'
import Connection from '../libs/HttpConnection'
import Server from '../libs/HttpServer'
import { ensureDirs, removeFiles, unzip } from '../share/fns'
import Base from './Base'
import { IncomingMessage } from 'http'
import { CommandError, StandardResponse } from '../typings'

export default class Http extends Base {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.devTool = new DevTool(this.options)
    this.server = new Server()
    this.server.route('GET', '/status', this.status.bind(this))
    this.server.route('POST', '/upload', this.upload.bind(this))
  }

  public start (): Promise<void> {
    return new Promise((resolve) => {
      const { port } = this.options
      this.server.listen(port, resolve)
    })
  }

  public async status (_: RegExpExecArray, conn: Connection): Promise<void> {
    this.writeJson({ message: 'okaya, server is running.' }, conn)
  }

  public async upload (_: RegExpExecArray, conn: Connection): Promise<void> {
    const { request } = conn
    const { uploadPath, deployPath } = this.options
    await ensureDirs(uploadPath, deployPath)

    const { file: uploadFile, uid, appid, version, message, compileType, libVersion, projectname } = await this.transfer(request)
    const log = this.logger(uid)

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
    let response = this.standard({ ...content, status: conn.status })
    conn.writeJson(response)
  }
}
