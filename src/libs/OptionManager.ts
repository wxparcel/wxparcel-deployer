import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { isOSX, isWin } from '../share/device'
import { osx as osxCli, win as winCli } from '../constants/cli'
import { WXOptions } from '../types'

export default class OptionManager {
  public rootPath: string
  public tempPath: string
  public uid: string
  public cli: string
  public repository: string

  constructor (options: WXOptions) {
    this.rootPath = path.join(__dirname, '../../')
    this.tempPath = path.join(this.rootPath, './.temporary')
    this.uid = uuid()
    this.cli = isOSX ? path.join(options.wxdevtool, osxCli) : isWin ? path.join(options.wxdevtool, winCli) : ''
    this.repository = options.repository
  }
}
