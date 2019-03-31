import fs = require('fs-extra')
import path = require('path')
import { promisify } from 'util'
import commandExists = require('command-exists')
import Zip = require('jszip')
import { spawnPromisify, zip as compress } from '../share/fns'
import { validProject, findRootFolder } from '../share/wx'

export default class Client {
  public async compress (folder: string, zipFile: string): Promise<void> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const zip = new Zip()
    const rootPath = findRootFolder(folder)
    const projFile = path.join(rootPath, 'project.config.json')

    if (fs.existsSync(projFile)) {
      compress(rootPath, rootPath, zip)

    } else {
      let file = path.join(folder, 'project.config.json')
      compress(rootPath, folder, zip)
      compress(file, folder, zip)
    }

    return new Promise((resolve, reject) => {
      fs.ensureDirSync(path.dirname(zipFile))

      const writeStream = fs.createWriteStream(zipFile)
      writeStream.once('error', reject)
      writeStream.once('close', resolve)

      const readStream = zip.generateNodeStream({ streamFiles: true })
      readStream.pipe(writeStream)
      readStream.once('error', reject)
      readStream.once('end', () => writeStream.close())
    })
  }

  public async getGitMessage (folder: string): Promise<string> {
    const git = path.join(folder, '.git')
    const exists = fs.existsSync(git)
    if (!exists) {
      return ''
    }

    const support = await promisify(commandExists.bind(null))('git')
    if (!support) {
      return ''
    }

    let message = ''
    await spawnPromisify('git', ['log', '-1', '--pretty=%B'], {}, (buffer, type) => {
      if (type === 'out') {
        message = buffer.toString()
      }
    })

    return message
  }

  public async getProjectConfig (folder: string): Promise<any> {
    let file = path.join(folder, 'project.config.json')
    return promisify(fs.readJSON.bind(fs))(file)
  }
}
