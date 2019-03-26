import * as path from 'path'
import { v4 as uuid } from 'uuid'
import trimEnd = require('lodash/trimEnd')
import { WXParcelOptions } from '../types'

export default class OptionManager {
  public uid: string
  public rootPath: string
  public tempPath: string
  public uploadFile: string
  public devToolServer: string
  public deployServerPort: number
  public maxFileSize: number

  constructor (options: WXParcelOptions) {
    this.uid = uuid()
    this.rootPath = process.cwd()
    this.tempPath = path.join(this.rootPath, './.temporary')
    this.uploadFile = 'upload'

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
