import * as fs from 'fs-extra'
import * as path from 'path'
import { IncomingMessage } from 'http'
import { IncomingForm } from 'formidable'
import forEach = require('lodash/forEach')
import Zip = require('jszip')
import { ServerOptions } from './OptionManager'
import Server from './Server'
import Connection from './Connection'
import DevTool from './DevTool'
import { writeFilePromisify } from '../share/fns'

export default class Deployer {
  private options: ServerOptions
  private devTool: DevTool
  private server: Server

  constructor (options: ServerOptions) {
    this.options = options
  }

  public start (): Promise<void> {
    return new Promise((resolve) => {
      const { deployServerPort } = this.options
      this.devTool = new DevTool(this.options)

      this.server = new Server()
      this.server.route('GET', '/status', this.status.bind(this))
      this.server.route('POST', '/upload', this.upload.bind(this))
      this.server.route('GET,POST,PUT,DELETE,PATCH', '/:otherwise*', this.notFound.bind(this))

      this.server.listen(deployServerPort, resolve)
    })
  }

  private async status (_, conn: Connection): Promise<void> {
    conn.toJson({ message: 'okaya, server is running.' })
  }

  private async upload (_, conn: Connection): Promise<void> {
    const { request } = conn
    const { uploadPath, deployPath } = this.options
    await this.ensureDirs(uploadPath, deployPath)

    const { file: uploadFile, version, description } = await this.transfer(request)
    const uploadFileName = path.basename(uploadFile).replace(path.extname(uploadFile), '')
    const zip = new Zip()
    const projFolder = path.join(deployPath, uploadFileName)
    const contents = await zip.loadAsync(fs.readFileSync(uploadFile))
    const promises = Object.keys(contents.files).map(async (file) => {
      if (!zip.file(file)) {
        return
      }

      const content = await zip.file(file).async('nodebuffer')

      file = path.join(projFolder, file)
      const folder = path.dirname(file)

      fs.ensureDirSync(folder)
      return writeFilePromisify(file, content)
    })

    await Promise.all(promises)
    await this.devTool.upload(projFolder, version, description)
    await this.removeFiles(uploadFile, projFolder)

    conn.toJson({ message: 'Upload completed.' })
  }

  private async notFound (_, conn: Connection): Promise<void> {
    conn.setStatus(404)
    conn.toJson()
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

  private ensureDirs (...dirs: Array<string>) {
    let promises = dirs.map((dir) => fs.ensureDir(dir))
    return Promise.all(promises)
  }

  private removeFiles (...files: Array<string>) {
    let promises = files.map((dir) => fs.remove(dir))
    return Promise.all(promises)
  }
}
