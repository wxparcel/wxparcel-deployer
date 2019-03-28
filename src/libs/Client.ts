import * as fs from 'fs-extra'
import * as path from 'path'
import { promisify } from 'util'
import forEach = require('lodash/forEach')
import commandExists = require('command-exists')
import Zip = require('jszip')
import axios, { AxiosInstance } from 'axios'
import FormData = require('form-data')
import { ClientOptions } from './OptionManager'
import { unitSize, spawnPromisify } from '../share/fns'
import { validProject, findRootFolder } from '../share/wx'
import { ClientZipSource } from '../types'

export default class Client {
  private options: ClientOptions
  private request: AxiosInstance

  constructor (options: ClientOptions) {
    this.options = options

    const axiosOptions = {
      baseURL: this.options.deployServer
    }

    this.request = axios.create(axiosOptions)
  }

  public async uploadProject (folder: string, version: string, message: string): Promise<any> {
    message = message || await this.getGitMessage(folder)

    const { uid, releasePath } = this.options
    const zipFile = path.join(releasePath, `${uid}.zip`)

    await this.compress(folder, zipFile)
    const response = await this.upload('/upload', zipFile, { uid, version, message })

    fs.removeSync(zipFile)
    return response
  }

  public async compress (folder: string, zipFile: string): Promise<void> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const zip = new Zip()
    const rootPath = findRootFolder(folder)
    const projFile = path.join(rootPath, 'project.config.json')

    if (fs.existsSync(projFile)) {
      this.zip(rootPath, rootPath, zip)

    } else {
      let file = path.join(folder, 'project.config.json')
      this.zip(rootPath, folder, zip)
      this.zip(file, folder, zip)
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

  public async upload (serverUrl: string, file: string, data: { [key: string]: any }): Promise<any> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not found`))
    }

    return new Promise(async (resolve, reject) => {
      const { maxFileSize } = this.options
      const { size } = fs.statSync(file)
      if (size > maxFileSize) {
        return Promise.reject(new Error(`File size is over ${unitSize(maxFileSize)}`))
      }

      const stream = fs.createReadStream(file)
      stream.once('error', reject)
      stream.once('end', () => stream.close())

      const formData = new FormData()
      formData.append('file', stream)
      forEach(data, (value, name) => formData.append(name, value))

      const contentSzie = await promisify(formData.getLength.bind(formData))()

      const headers = {
        'Accept': 'application/json',
        'Content-Type': `multipart/form-data; charset=utf-8; boundary="${formData.getBoundary()}"`,
        'Content-Length': contentSzie
      }

      const result = await this.request.post(serverUrl, formData, { headers })
      resolve(result)
    })
  }

  private async getGitMessage (folder: string): Promise<string> {
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

  private findFiles (file: string, relativeTo: string) {
    const fileMap: Array<ClientZipSource> = []

    const findDeep = (file: string): void => {
      const stat = fs.statSync(file)

      if (stat.isFile()) {
        const destination = file.replace(relativeTo, '')
        fileMap.push({ file, destination })
      }

      if (stat.isDirectory()) {
        const folder = path.isAbsolute(file) ? file : path.join(file, relativeTo)
        const files = fs.readdirSync(file)

        files.forEach((filename) => {
          let file = path.join(folder, filename)
          findDeep(file)
        })
      }
    }

    findDeep(file)
    return fileMap
  }

  private zip (file: string, relativeTo: string, zip: Zip = new Zip()): Zip {
    let fileMap = this.findFiles(file, relativeTo)

    fileMap.forEach(({ file, destination }) => {
      let name = path.basename(destination)
      let folder = path.dirname(destination)
      let stream = fs.createReadStream(file)
      zip.folder(folder).file(name, stream)
    })

    return zip
  }
}
