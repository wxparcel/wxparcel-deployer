import * as path from 'path'
import OptionManager from './OptionManager'
import { ensureFilePromisify, removeFilePromisify, spawnPromisify } from '../share/fns'
import { StdoutHandle } from '../types'

export default class DevTool {
  private options: OptionManager

  constructor (options: OptionManager) {
    this.options = options
  }

  public async login () {
    const { tempPath, uid, cli } = this.options
    const qrcodeFile = path.join(tempPath, `./qrcodes/${uid}.txt`)
    const userFile = path.join(tempPath, `./users/${uid}.json`)

    const ensureDirPromises = [
      ensureFilePromisify(qrcodeFile),
      ensureFilePromisify(userFile)
    ]

    await Promise.all(ensureDirPromises)

    const params = [
      '--login',
      '--login-qr-output', `base64@${qrcodeFile}`,
      '--login-result-output', `${userFile}`
    ]

    await spawnPromisify(cli, params)

    const removePromises = [
      removeFilePromisify(qrcodeFile),
      removeFilePromisify(userFile)
    ]

    await Promise.all(removePromises)
  }

  public async preview (folder: string) {
    const { cli, uid, tempPath } = this.options
    const qrcodeFile = path.join(tempPath, `./qrcodes/${uid}.txt`)

    ensureFilePromisify(qrcodeFile)

    const params = [
      '--preview',
      folder
    ]

    await spawnPromisify(cli, params, {}, (data) => {
      console.log(data.toString('utf-8'))
    })
  }
}
