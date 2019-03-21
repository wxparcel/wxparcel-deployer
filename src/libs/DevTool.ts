import * as path from 'path'
import * as fs from 'fs-extra'
import axios, { AxiosInstance } from 'axios'
import OptionManager from './OptionManager'
import { ensureFilePromisify } from '../share/fns'
import { DevToolQrCodeCallback } from '../types'

export default class DevTool {
  private options: OptionManager
  private request: AxiosInstance

  constructor (options: OptionManager) {
    const axiosOptions = {
      baseURL: options.server,
      interceptors: {
        response (response) {
          const { status, data: message } = response
          if (status === 200) {
            return Promise.resolve(response)
          }

          return Promise.reject(new Error(message))
        }  
      }
    }

    this.options = options
    this.request = axios.create(axiosOptions)
  }

  private async execTask (task: (statsFile: string) => void) {
    const { tempPath, uid } = this.options
    const statsFile = path.join(tempPath, `./stats/${uid}.json`)

    await ensureFilePromisify(statsFile)
    await task(statsFile)

    return new Promise((resolve, reject) => {
      const changeHandle = (eventType: string) => {
        if (eventType == 'change') {
          watcher.close()

          let content = fs.readJSONSync(statsFile) || {}
          if (content.status === 'SUCCESS') {
            resolve()
            return
          }

          reject(new Error(content.error))
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
  public async login (qrcodeCallback: DevToolQrCodeCallback) {
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

    return await this.execTask(task)
  }

  /**
   * 上传代码
   * 
   * @param folder 项目文件夹
   * @param qrcodeCallback 二维码处理回调
   */
  public async preview (folder: string, qrcodeCallback: DevToolQrCodeCallback) {
    const task = async (statsFile) => {
      let projFile = path.join(folder, 'project.config.json')
      let appFile = path.join(folder, 'app.json')

      let projOptions = fs.readJSONSync(projFile)
      if (projOptions.hasOwnProperty('miniprogramRoot')) {
        appFile = path.join(folder, projOptions.miniprogramRoot, 'app.json')
      }

      let appOptions = fs.readJsonSync(appFile)
      if (!Array.isArray(appOptions.pages) || appOptions.pages.length === 0) {
        throw new Error('Pages is empty')
      }

      const params = {
        format: 'base64',
        projectpath: folder,
        infooutput: statsFile,
        compilecondition: {
          pathName: appOptions.pages[0]
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
  public async upload (folder: string, version: string, description: string) {
    const task = async (statsFile) => {
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
  public async autopreview (folder: string) {
    const task = async (statsFile) => {
      const params = {
        projectpath: folder,
        infooutput: statsFile
      }

      await this.request.get('/autopreview', { params })
    }

    return await this.execTask(task)
  } 
}
