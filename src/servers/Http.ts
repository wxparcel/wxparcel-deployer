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
import { CommandError } from '../typings'

export default class Http extends Base {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server

  constructor (options: ServerOptions) {
    super()

    this.options = options
  }

  public start (): Promise<void> {
    return new Promise((resolve) => {
      const { deployServerPort } = this.options
      this.devTool = new DevTool(this.options)

      this.server = new Server()
      this.server.route('GET', '/status', this.status.bind(this))
      this.server.route('POST', '/upload', this.upload.bind(this))
      this.server.listen(deployServerPort, resolve)
    })
  }

  public async status (_: RegExpExecArray, conn: Connection): Promise<void> {
    conn.toJson({ message: 'okaya, server is running.' })
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
      switch (error.code) {
        case 255:
          conn.setStatus(401)
          conn.toJson({ message: 'You don\'t have permission to upload' })
          break
        case -408:
          conn.setStatus(408)
          conn.toJson({ message: 'Upload timeout, please retry' })
          break
      }

      return Promise.reject(error)
    }

    await this.execute(command).catch(catchError)
    await removeFiles(uploadFile, projFolder)

    log('Upload completed')
    conn.toJson({ message: 'Upload completed.' })
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

  public destory (): void {
    super.destory()

    this.server.close()

    this.devTool = undefined
    this.options = undefined
  }
}
