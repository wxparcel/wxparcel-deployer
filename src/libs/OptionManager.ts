import os = require('os')
import fs = require('fs-extra')
import path = require('path')
import shortid = require('shortid')
import ip = require('ip')
import trimEnd = require('lodash/trimEnd')
import { LogTypes, BaseOptions, ServerBaseOptions, ClientBaseOptions } from '../typings'

export class OptionManager {
  public uid: string
  public ip: string
  public logType: keyof typeof LogTypes
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
    this.logType = options.logType || 'console'
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

export class ServerOptions extends OptionManager {
  public uploadPath: string
  public deployPath: string
  public qrcodePath: string
  public devToolCli: string
  public devToolServer: string
  public port: number

  constructor (options: ServerBaseOptions) {
    super(options)

    this.uploadPath = options.uploadPath && path.isAbsolute(options.uploadPath) ? options.uploadPath : path.join(this.tempPath, options.uploadPath || 'upload')
    this.deployPath = options.deployPath && path.isAbsolute(options.deployPath) ? options.deployPath : path.join(this.tempPath, options.deployPath || 'deploy')
    this.qrcodePath = options.qrcodePath && path.isAbsolute(options.qrcodePath) ? options.qrcodePath : path.join(this.tempPath, options.qrcodePath || 'qrcode')
    this.devToolCli = this.isOSX ? '/Applications/wechatwebdevtools.app/Contents/MacOS/cli' : ''

    this.configure(options)
  }

  public configure (options: ServerBaseOptions) {
    super.configure(options)

    if (options.hasOwnProperty('port')) {
      this.port = options.port
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
    this.deployServer = options.server || `http://${this.ip}:3000`

    if (!/https?:\/\//.test(this.deployServer)) {
      throw new Error(`Deploy server error, ${this.deployServer}`)
    }
  }
}
