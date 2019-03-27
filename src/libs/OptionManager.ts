import * as path from 'path'
import { v4 as uuid } from 'uuid'
import trimEnd = require('lodash/trimEnd')
import { WXParcelOptions } from '../types'

export default class OptionManager {
  public uid: string
  public rootPath: string
  public tempPath: string
  public releasePath: string
  public uploadPath: string
  public deployPath: string
  public devToolServer: string
  public deployServerPort: number
  public maxFileSize: number

  constructor (options: WXParcelOptions) {
    this.uid = uuid()
    this.rootPath = process.cwd()
    this.tempPath = options.tempPath && path.isAbsolute(options.tempPath) ? options.tempPath : path.join(this.rootPath, options.tempPath || '.temporary')
    this.releasePath = options.releasePath && path.isAbsolute(options.releasePath) ? options.releasePath : path.join(this.tempPath, options.releasePath || 'release')
    this.uploadPath = options.uploadPath && path.isAbsolute(options.uploadPath) ? options.uploadPath : path.join(this.tempPath, options.uploadPath || 'upload')
    this.deployPath = options.deployPath && path.isAbsolute(options.deployPath) ? options.deployPath : path.join(this.tempPath, options.deployPath || 'deploy')
    this.maxFileSize = 1024 * 1024 * 8

    this.configure(options)
  }

  public configure (options: WXParcelOptions) {
    if (options.hasOwnProperty('deployServerPort')) {
      this.deployServerPort = options.deployServerPort
    }

    if (options.hasOwnProperty('devToolServer')) {
      this.devToolServer = trimEnd(options.devToolServer, '/')
    }

    if (options.hasOwnProperty('maxFileSize')) {
      this.maxFileSize = options.maxFileSize
    }
  }
}
