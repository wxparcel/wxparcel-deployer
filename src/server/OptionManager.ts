import path = require('path')
import fs = require('fs-extra')
import BaseOptionManager from '../libs/OptionManager'

import { ServerBaseOptions } from '../typings'

export default class OptionManager extends BaseOptionManager {
  public uploadPath: string
  public deployPath: string
  public qrcodePath: string
  public devToolServer: string
  public port: number

  constructor (options: ServerBaseOptions) {
    super(options)

    this.uploadPath = options.uploadPath && path.isAbsolute(options.uploadPath) ? options.uploadPath : path.join(this.tempPath, options.uploadPath || 'upload')
    this.deployPath = options.deployPath && path.isAbsolute(options.deployPath) ? options.deployPath : path.join(this.tempPath, options.deployPath || 'deploy')
    this.qrcodePath = options.qrcodePath && path.isAbsolute(options.qrcodePath) ? options.qrcodePath : path.join(this.tempPath, options.qrcodePath || 'qrcode')

    this.configure(options)
  }

  public configure (options: ServerBaseOptions): void {
    super.configure(options)

    if (options.hasOwnProperty('port')) {
      this.port = options.port
    }

    if (options.hasOwnProperty('devToolServer') && /^https?:\/\//.test(options.devToolServer)) {
      this.devToolServer = options.devToolServer
    }
  }
}
