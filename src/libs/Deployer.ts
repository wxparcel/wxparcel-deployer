import * as fs from 'fs-extra'
import * as path from 'path'
import { IncomingMessage } from 'http'
import chalk from 'chalk'
import { IncomingForm } from 'formidable'
import forEach = require('lodash/forEach')
import Zip = require('jszip')
import { ServerOptions } from './OptionManager'
import Server from './Server'
import Connection from './Connection'
import DevTool from './DevTool'
import stdoutServ from '../services/stdout'
import { writeFilePromisify } from '../share/fns'
import { CommandError } from '../types'

export default class Deployer {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server
  private commandQueue: Array<Promise<any>>

  constructor (options: ServerOptions) {
    this.options = options
    this.commandQueue = []
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

  private async status (params: RegExpExecArray, conn: Connection): Promise<void> {
    conn.toJson({ message: 'okaya, server is running.' })
  }

  private async upload (params: RegExpExecArray, conn: Connection): Promise<void> {
    const { request } = conn
    const { uploadPath, deployPath } = this.options
    await this.ensureDirs(uploadPath, deployPath)

    const { file: uploadFile, uid, appid, version, message, compileType, libVersion, projectname } = await this.transfer(request)
    const log = this.logger(uid)

    log(`Upload completed. Version ${chalk.bold(version)} Appid ${chalk.bold(appid)} CompileType ${chalk.bold(compileType)} LibVersion ${chalk.bold(libVersion)} ProjectName ${chalk.bold(projectname)}`)

    const uploadFileName = appid || uid || path.basename(uploadFile).replace(path.extname(uploadFile), '')
    const projFolder = path.join(deployPath, uploadFileName)
    const unzipPromises = await this.unzip(uploadFile, projFolder)

    unzipPromises.length > 0 && log(`Uncompress file ${chalk.bold(path.basename(uploadFile))}, project folder is ${chalk.bold(path.basename(projFolder))}`)
    this.commandQueue.length > 0 && log('Wait for other command execution of the devTool')

    let promises = [].concat(unzipPromises, this.commandQueue)
    promises.length > 0 && await Promise.all(promises)

    let devToolPromise = this.devTool.upload(projFolder, version, message)
    this.commandQueue.push(devToolPromise)

    log('Start to upload to weixin server')

    await devToolPromise.catch((error: CommandError) => {
      if (error.code === 255) {
        conn.setStatus(401)
        conn.toJson({ message: 'You don\'t have permission to upload' })
      }

      return Promise.reject(error)
    })

    let index = this.commandQueue.indexOf(devToolPromise)
    this.commandQueue.splice(index, 1)

    await this.removeFiles(uploadFile, projFolder)
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

  private async unzip (file: string, folder: string): Promise<Array<Promise<void>>> {
    const zip = new Zip()
    const contents = await zip.loadAsync(fs.readFileSync(file))

    return Object.keys(contents.files).map(async (file) => {
      if (!zip.file(file)) {
        return
      }

      const content = await zip.file(file).async('nodebuffer')

      file = path.join(folder, file)
      const parent = path.dirname(file)

      fs.ensureDirSync(parent)
      return writeFilePromisify(file, content)
    })
  }

  private ensureDirs (...dirs: Array<string>) {
    let promises = dirs.map((dir) => fs.ensureDir(dir))
    return Promise.all(promises)
  }

  private removeFiles (...files: Array<string>) {
    let promises = files.map((dir) => fs.remove(dir))
    return Promise.all(promises)
  }

  private logger (uid: string): (message: string) => void {
    return (message) => {
      const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      stdoutServ.info(`[${chalk.green(uid)}] ${message} ${chalk.gray(datetime)}`)
    }
  }

  public async destory (): Promise<void> {
    this.server.destory()
    this.commandQueue.splice(0)
    await this.devTool.quit()

    this.options = null
    this.devTool = null
    this.commandQueue = null
  }
}
