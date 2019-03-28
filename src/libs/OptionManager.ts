import * as os from 'os'
import * as fs from 'fs-extra'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import * as ip from 'ip'
import trimEnd = require('lodash/trimEnd')
import { LogTypes, BaseOptions, ServerBaseOptions, ClientBaseOptions } from '../types'

export class OptionManager {
  public uid: string
  public ip: string
  public logType: keyof typeof LogTypes
  public rootPath: string
  public tempPath: string
  public maxFileSize: number
  public isOSX: boolean
  public isWin: boolean

  constructor (options: BaseOptions) {
    this.uid = uuid()
    this.ip = ip.address()
    this.rootPath = process.cwd()
    this.tempPath = options.tempPath && path.isAbsolute(options.tempPath) ? options.tempPath : path.join(this.rootPath, options.tempPath || '.runtime')
    this.logType = options.logType || 'console'
    this.maxFileSize = 1024 * 1024 * 8
    this.isOSX = 'darwin' === os.platform()
    this.isWin = 'win32' === os.platform()

    this.configure(options)
  }

  public configure (options: BaseOptions) {
    if (options.hasOwnProperty('maxFileSize')) {
      this.maxFileSize = options.maxFileSize
    }
  }
}

export class ServerOptions extends OptionManager {
  public uploadPath: string
  public deployPath: string
  public qrcodePath: string
  public devToolCli: string
  public devToolServer: string
  public deployServerPort: number

  constructor (options: ServerBaseOptions) {
    super(options)

    this.uploadPath = options.uploadPath && path.isAbsolute(options.uploadPath) ? options.uploadPath : path.join(this.tempPath, options.uploadPath || 'upload')
    this.deployPath = options.deployPath && path.isAbsolute(options.deployPath) ? options.deployPath : path.join(this.tempPath, options.deployPath || 'deploy')
    this.qrcodePath = options.qrcodePath && path.isAbsolute(options.qrcodePath) ? options.qrcodePath : path.join(this.tempPath, options.qrcodePath || 'qrcode')
    this.devToolCli = this.isOSX ? '/Applications/wechatwebdevtools.app/Contents/MacOS/cli' : ''
  }

  public configure (options: ServerBaseOptions) {
    super.configure(options)

    if (options.hasOwnProperty('deployServerPort')) {
      this.deployServerPort = options.deployServerPort
    }

    if (options.hasOwnProperty('devToolServer')) {
      this.devToolServer = trimEnd(options.devToolServer, '/')
    }

    if (options.hasOwnProperty('devToolCli') && fs.existsSync(options.devToolCli)) {
      this.devToolCli = options.devToolCli
    }
  }
}

export class ClientOptions extends OptionManager {
  public releasePath: string
  public deployServer: string

  constructor (options: ClientBaseOptions) {
    super(options)

    this.releasePath = options.releasePath && path.isAbsolute(options.releasePath) ? options.releasePath : path.join(this.tempPath, options.releasePath || 'release')
    this.deployServer = options.deployServer || `http://${this.ip}:3000`
  }
}
