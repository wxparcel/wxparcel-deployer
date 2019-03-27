import * as fs from 'fs-extra'
import * as path from 'path'
import Zip = require('jszip')
import axios, { AxiosInstance } from 'axios'
import { ClientOptions } from './OptionManager'
import { unitSize } from '../share/fns'
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

  public async uploadProject (folder: string, version: string, description: string): Promise<any> {
    const { uid, releasePath } = this.options
    const zipFile = path.join(releasePath, `${uid}.zip`)

    await this.compress(folder, zipFile)
    const response = await this.upload('/upload', zipFile, { version, description })

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

  public async upload (serverUrl: string, file: string, data?: { [key: string]: any }): Promise<any> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not found`))
    }

    return new Promise((_, reject) => {
      const { maxFileSize } = this.options
      const { size } = fs.statSync(file)
      if (size > maxFileSize) {
        return Promise.reject(new Error(`File size is over ${unitSize(maxFileSize)}`))
      }

      const stream = fs.createReadStream(file)
      stream.once('error', reject)
      stream.once('end', () => stream.close())

      const headers = {
        'Content-Type': 'application/zip, application/octet-stream',
        'Content-Disposition': 'attachment',
        'Content-Length': size
      }

      return this.request.post(serverUrl, stream, { headers })
    })
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
