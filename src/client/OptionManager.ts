import path = require('path')
import BaseOptionManager from '../libs/OptionManager'
import { ClientBaseOptions } from '../typings'

export default class ClientOptions extends BaseOptionManager {
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
