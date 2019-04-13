import fs = require('fs-extra')
import trim = require('lodash/trim')
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
      writeStream.once('error', reject).once('close', resolve)

      zip
      .generateNodeStream({ streamFiles: true })
      .pipe(writeStream)
      .once('finish', () => writeStream.close())
      .once('error', reject)
    })
  }

  public async checkGit (folder: string): Promise<boolean> {
    const git = path.join(folder, '.git')
    const exists = fs.existsSync(git)
    if (!exists) {
      return false
    }

    const support = await promisify(commandExists.bind(null))('git')
    if (!support) {
      return false
    }

    return true
  }

  public async getGitMessage (folder: string): Promise<string> {
    if (!this.checkGit(folder)) {
      return ''
    }

    let message = ''
    await spawnPromisify('git', ['log', '-1', '--format=%an%n%ae%n%cd%n%h%n%B'], {}, (buffer, type) => {
      if (type === 'out') {
        message += buffer.toString()
      }
    })

    return trim(message, '\n')
  }

  public async getGitRepo (folder: string): Promise<string> {
    if (!this.checkGit(folder)) {
      return ''
    }

    let repo = ''
    await spawnPromisify('git', ['config', '--get', 'remote.origin.url'], {}, (buffer, type) => {
      if (type === 'out') {
        repo += buffer.toString()
      }
    })

    return trim(repo, '\n')
  }

  public async getProjectConfig (folder: string): Promise<any> {
    let file = path.join(folder, 'project.config.json')
    return promisify(fs.readJSON.bind(fs))(file)
  }
}
