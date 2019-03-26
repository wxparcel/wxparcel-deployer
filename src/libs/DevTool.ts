import * as path from 'path'
import * as fs from 'fs-extra'
import axios, { AxiosInstance } from 'axios'
import OptionManager from './OptionManager'
import { validProject, findPages } from '../share/wx'
import { WxParcelQrCodeCallback } from '../types'

const responseInterceptors = (response) => {
  const { status, data: message } = response
  if (status === 200) {
    return Promise.resolve(response)
  }

  return Promise.reject(new Error(message))
}

export default class DevTool {
  private options: OptionManager
  private request: AxiosInstance

  constructor (options: OptionManager) {
    this.options = options

    const axiosOptions = {
      baseURL: options.devToolServer,
      interceptors: {
        response: responseInterceptors
      }
    }

    this.request = axios.create(axiosOptions)
  }

  private async execTask (task: (statsFile: string) => void): Promise<any> {
    const { tempPath, uid } = this.options
    const statsFile = path.join(tempPath, `./stats/${uid}.json`)

    fs.ensureFileSync(statsFile)
    await task(statsFile)

    return new Promise((resolve, reject) => {
      const changeHandle = (eventType: string) => {
        switch (eventType) {
          case 'change': {
            watcher.close()

            try {
              let content = fs.readJSONSync(statsFile)
              resolve(content)

            } catch (error) {
              reject(new Error(error))
            }
          }
        }
      }
  
      const watcher = fs.watch(statsFile, { persistent: true }, changeHandle)
    })
  }

  /**
   * 登陆
   * 
   * @param qrcodeCallback 二维码处理回调
   */
  public async login (qrcodeCallback: WxParcelQrCodeCallback): Promise<any> {
    const task = async (statsFile) => {
      const params = {
        format: 'base64',
        resultoutput: statsFile
      }

      const response = await this.request.get('/login', { params })
      const { data: qrcode } = response
      if (!/^data:image\/jpeg;base64/.test(qrcode)) {
        return Promise.reject(new Error('QRcode is not a base64 data'))
      }
  
      qrcodeCallback(qrcode)
    }

    const response = await this.execTask(task)
    if (response.status !== 'SUCCESS') {
      return Promise.reject(new Error(response.error))
    }

    return response
  }

  /**
   * 上传代码
   * 
   * @param folder 项目文件夹
   * @param qrcodeCallback 二维码处理回调
   */
  public async preview (folder: string, qrcodeCallback: WxParcelQrCodeCallback): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const pages = await findPages(folder)

      const params = {
        format: 'base64',
        projectpath: folder,
        infooutput: statsFile,
        compilecondition: {
          pathName: pages[0]
        }
      }

      const response = await this.request.get('/preview', { params })
      const { data: qrcode } = response

      qrcodeCallback(`data:image/jpeg;base64,${qrcode}`)
    }

    return await this.execTask(task)
  }

  /**
   * 上传代码
   * 
   * @param folder 项目文件夹
   * @param version 发布版本号
   * @param description 发布描述
   */
  public async upload (folder: string, version: string, description: string): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const params = {
        projectpath: folder,
        version: version,
        desc: description,
        infooutput: statsFile
      }

      await this.request.get('/upload', { params })
    }

    return await this.execTask(task)
  }

  /**
   * 自动预览
   * 
   * @param folder 项目文件夹
   */
  public async autopreview (folder: string): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const params = {
        projectpath: folder,
        infooutput: statsFile
      }

      await this.request.get('/autopreview', { params })
    }

    return await this.execTask(task)
  } 
}
