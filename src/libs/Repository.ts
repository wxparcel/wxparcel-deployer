import * as path from 'path'
import OptionManager from './OptionManager'
import { spawnPromisify, ensureDirPromisify } from '../share/fns'

export default class Repository {
  private username: string
  private password: string
  private options: OptionManager
  
  constructor (options: OptionManager) {
    this.options = options
  }

  public setUsername (username: string) {
    this.username = username
  }

  public setPassword (password: string) {
    this.password = password
  }

  public async clone (repository: string) {
    const { uid, tempPath } = this.options
    const folder = path.join(tempPath, `repositories/${uid}`)
 
    if (this.username && this.password) {
      repository = `${this.username}:${this.password}@${repository}`
    }

    console.log(`Git clone repository ${repository} into ${folder}...`)
    await ensureDirPromisify(folder)
    await spawnPromisify('git', ['clone', repository, folder])

    return folder
  }
}
