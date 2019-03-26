import * as fs from 'fs-extra'
import * as path from 'path'
import Zip = require('jszip')
import axios, { AxiosInstance } from 'axios'
import OptionManager from './OptionManager'
import { unitSize } from '../share/fns'
import { validProject, findRootFolder } from '../share/wx'
import { WxParcelZipSource } from '../types'

export default class Client {
  private options: OptionManager
  private request: AxiosInstance

  constructor (options: OptionManager) {
    this.options = options

    const axiosOptions = {
      baseURL: 'http://127.0.0.1:3000'
    }

    this.request = axios.create(axiosOptions)
  }

  public async uploadProject (folder: string): Promise<void> {
    const { tempPath, uid } = this.options
    const zipFile = path.join(tempPath, 'deploy', `${uid}.zip`)

    await this.compress(folder, zipFile)
    await this.upload('/upload', zipFile)
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

    return new Promise((resolve) => {
      fs.ensureDirSync(path.dirname(zipFile))

      const stream = zip.generateNodeStream({ streamFiles: true })
      stream.pipe(fs.createWriteStream(zipFile))
      stream.on('end', resolve)
    })
  }

  public async upload (serverUrl: string, file: string): Promise<void> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not found`))
    }

    return new Promise((resolve, reject) => {
      const { maxFileSize } = this.options
      const { size } = fs.statSync(file)
      const stream = fs.createReadStream(file)
      stream.once('error', reject)

      if (size > maxFileSize) {
        return Promise.reject(new Error(`File size is over ${unitSize(maxFileSize)}`))
      }

      const headers = {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/zip, application/octet-stream',
        "Content-Disposition": "attachment",
        'Content-Length': size
      }

      this.request.post(serverUrl, stream, { headers }).then((response) => {
        console.log(response)
        resolve()
      }).catch(reject)
    })
  }

  private findFiles (file: string, relativeTo: string) {
    const fileMap: Array<WxParcelZipSource> = []

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
