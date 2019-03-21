import * as path from 'path'
import { v4 as uuid } from 'uuid'
import trimEnd = require('lodash/trimEnd')
import { WXOptions } from '../types'

export default class OptionManager {
  public rootPath: string
  public tempPath: string
  public uid: string
  public server: string
  public repository: string

  constructor (options: WXOptions) {
    this.rootPath = path.join(__dirname, '../../')
    this.tempPath = path.join(this.rootPath, './.temporary')
    this.uid = uuid()
    this.server = trimEnd(options.server, '/')
    this.repository = options.repository
  }
}
