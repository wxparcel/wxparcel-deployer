import * as fs from 'fs-extra'
import * as path from 'path'
import { IncomingMessage } from 'http'
import Zip = require('jszip')
import OptionsManager from './OptionManager'
import Server from './Server'
import Connection from './Connection'
import DevTool from './DevTool'
import { writeFilePromisify } from '../share/fns'

export default class Deployer {
  private options: OptionsManager
  private devTool: DevTool
  private server: Server

  constructor (options: OptionsManager) {
    this.options = options
  }

  public start () {
    this.devTool = new DevTool(this.options)

    this.server = new Server()
    this.server.route('GET', '/status', this.status.bind(this))
    this.server.route('GET', '/login', this.login.bind(this))
    this.server.route('POST', '/upload', this.upload.bind(this))
    this.server.route('GET,POST,PUT,DELETE,PATCH', '/:otherwise*', this.notFound.bind(this))
    this.server.listen(this.options.deployServerPort)
  }

  private async status (_, conn: Connection): Promise<void> {
    conn.toJson({ message: 'okaya, server is running.' })
  }

  private async login (_, conn: Connection): Promise<void> {
    // this.devTool.login((qrcode: string) => {
    //   this.wrapJsonResponse(request, response, { data: qrcode })
    // })
  }

  private async upload (_, conn: Connection): Promise<void> {
    const { request } = conn
    const { uid, uploadPath, deployPath } = this.options

    fs.ensureDirSync(uploadPath)
    fs.ensureDirSync(deployPath)

    const uploadFile = path.join(uploadPath, `${uid}.zip`)
    await this.tranfer(uploadFile, request)
    
    const zip = new Zip()
    const projFolder = path.join(deployPath, uid)
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
    await this.devTool.upload(projFolder, '1.0.0', '测试CI, 请勿用作预览版本或提审版本')

    fs.removeSync(uploadFile)
    fs.removeSync(projFolder)

    conn.toJson({ message: 'Upload completed.' })
  }

  private async notFound (_, conn: Connection): Promise<void> {
    conn.setStatus(404)
    conn.toJson()
  }

  private tranfer (file: string, request: IncomingMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(file)
      writeStream.on('error', reject)

      request.pipe(writeStream)
      request.on('error', reject)
      request.on('end', () => {
        writeStream.close()
        resolve()
      })
    })
  }
}