import fs = require('fs-extra')
import path = require('path')
import { promisify } from 'util'
import isPlainObject = require('lodash/isPlainObject')
import forEach = require('lodash/forEach')
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import FormData = require('form-data')
import { ClientOptions } from '../libs/OptionManager'
import Client from '../libs/Client'
import stdoutServ from '../services/stdout'
import { unitSize } from '../share/fns'
import { CommandError } from '../typings'

export default class HttpClient extends Client {
  private options: ClientOptions
  private request: AxiosInstance

  constructor (options: ClientOptions) {
    super()

    this.options = options

    const { deployServer: server } = this.options
    const serverUrl = /^https?:\/\//.test(server) ? server : `http://${server}`
    const axiosOptions: AxiosRequestConfig = {
      baseURL: serverUrl
    }

    this.request = axios.create(axiosOptions)
    this.request.interceptors.response.use((response: AxiosResponse) => response, (rejection: AxiosError) => {
      let { response } = rejection
      if (!response) {
        return Promise.reject(new Error('The request could not be sent, please check the network status or server status'))
      }

      if (isPlainObject(response.data)) {
        let { message, ...others } = response.data
        let error: CommandError = new Error(message)
        Object.assign(error, others)
        return Promise.reject(error)
      }

      return Promise.reject(new Error(response.data))
    })
  }

  public async status () {
    let response = await this.request.get('status')
    return response
  }

  public async upload (folder: string, version: string, message: string): Promise<any> {
    message = message || await this.getGitMessage(folder)

    const { releasePath } = this.options
    const { appid, compileType, libVersion, projectname } = await this.getProjectConfig(folder)
    const zipFile = path.join(releasePath, `${appid}.zip`)

    await this.compress(folder, zipFile)
    let datas = { appid, version, message, compileType, libVersion, projectname: decodeURIComponent(projectname) }
    const response = await this.uploadFile('/upload', zipFile, datas).catch((error: CommandError) => {
      fs.removeSync(zipFile)
      return Promise.reject(error)
    })

    fs.removeSync(zipFile)
    return response
  }

  private async uploadFile (url: string, file: string, data: { [key: string]: any }): Promise<any> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not found`))
    }

    return new Promise(async (resolve, reject) => {
      const { uid, maxFileSize } = this.options
      const { size } = fs.statSync(file)
      if (size > maxFileSize) {
        return Promise.reject(new Error(`File size is over ${unitSize(maxFileSize)}`))
      }

      const stream = fs.createReadStream(file)
      stream.once('error', reject)
      stream.once('end', () => stream.close())

      const formData = new FormData()
      formData.append('file', stream)
      forEach(Object.assign({ uid }, data), (value, name) => formData.append(name, value))

      const catchError = (error) => {
        reject(error)
        return Promise.reject(error)
      }

      const contentSzie = await promisify(formData.getLength.bind(formData))().catch(catchError)

      const headers = {
        'Accept': 'application/json',
        'Content-Type': `multipart/form-data; charset=utf-8; boundary="${formData.getBoundary()}"`,
        'Content-Length': contentSzie
      }

      const config = {
        headers,
        onUploadProgress (event) {
          const { loaded, total } = event
          stdoutServ.loading(loaded, total, 'Upload file')
        }
      }

      const result = await this.request.post(url, formData, config).catch(catchError)

      resolve(result)
    })
  }
}
