import os = require('os')
import path = require('path')
import shortid = require('shortid')
import ip = require('ip')
import { LoggerMethods, BaseOptions, ClientBaseOptions } from '../typings'

export default class OptionManager {
  public uid: string
  public ip: string
  public logMethod: string | Array<string>
  public rootPath: string
  public tempPath: string
  public maxFileSize: number
  public isOSX: boolean
  public isWin: boolean
  public isDevelop: boolean

  constructor (options: BaseOptions) {
    this.uid = options.uid || shortid.generate()
    this.ip = ip.address()
    this.rootPath = process.cwd()
    this.tempPath = options.tempPath && path.isAbsolute(options.tempPath) ? options.tempPath : path.join(this.rootPath, options.tempPath || '.runtime')
    this.logMethod = options.logMethod || LoggerMethods.CONSOLE
    this.maxFileSize = 1024 * 1024 * 8
    this.isOSX = 'darwin' === os.platform()
    this.isWin = 'win32' === os.platform()
    this.isDevelop = process.argv.findIndex((argv) => argv === '--develop') !== -1

    this.configure(options)
  }

  public configure (options: BaseOptions) {
    if (options.hasOwnProperty('maxFileSize')) {
      this.maxFileSize = options.maxFileSize
    }

    if (options.hasOwnProperty('isDevelop')) {
      this.isDevelop = options.isDevelop
    }
  }
}

export class ClientOptions extends OptionManager {
  public releasePath: string
  public deployServer: string

  constructor (options: ClientBaseOptions) {
    super(options)

    this.releasePath = options.releasePath && path.isAbsolute(options.releasePath) ? options.releasePath : path.join(this.tempPath, options.releasePath || 'release')
    this.deployServer = options.server || `http://${this.ip}:3000`

    if (!/https?:\/\//.test(this.deployServer)) {
      throw new Error(`Deploy server error, ${this.deployServer}`)
    }
  }
}
