import fs = require('fs-extra')
import path = require('path')
import { promisify } from 'util'
import forEach = require('lodash/forEach')
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import FormData = require('form-data')
import { ClientOptions } from '../libs/OptionManager'
import Base from './Base'
import stdoutServ from '../services/stdout'
import { unitSize } from '../share/fns'

export default class Http extends Base {
  private options: ClientOptions
  private request: AxiosInstance

  constructor (options: ClientOptions) {
    super()

    this.options = options

    const { deployServer } = this.options
    const serverUrl = /^https?:\/\//.test(deployServer) ? deployServer : `http://${deployServer}`
    const axiosOptions: AxiosRequestConfig = {
      baseURL: serverUrl
    }

    this.request = axios.create(axiosOptions)
    this.request.interceptors.response.use(async (response: AxiosResponse) => response, (rejection: AxiosError) => {
      let { response } = rejection
      if (!response) {
        return Promise.reject(new Error('The request could not be sent, please check the network status or server status'))
      }

      return Promise.reject(response.data)
    })
  }

  public async uploadProject (folder: string, version: string, message: string): Promise<any> {
    message = message || await this.getGitMessage(folder)

    const { appid, compileType, libVersion, projectname } = await this.getProjectConfig(folder)
    const { uid, releasePath } = this.options
    const zipFile = path.join(releasePath, `${appid}.zip`)

    await this.compress(folder, zipFile)
    const response = await this.upload('/upload', zipFile, { uid, appid, version, message, compileType, libVersion, projectname: decodeURIComponent(projectname) })

    fs.removeSync(zipFile)
    return response
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

      const config = {
        headers,
        onUploadProgress (event) {
          const { loaded, total } = event
          stdoutServ.loading(loaded, total, 'Upload file')
        }
      }

      const result = await this.request.post(serverUrl, formData, config).catch((error) => {
        let { message } = error
        stdoutServ.error(message)

        return Promise.reject(error)
      })

      resolve(result)
    })
  }
}
