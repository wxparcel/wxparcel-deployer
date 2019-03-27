import * as path from 'path'
import * as fs from 'fs-extra'
import { SpawnOptions } from 'child_process'
import axios, { AxiosInstance } from 'axios'
import OptionManager from './OptionManager'
import { validProject, findPages } from '../share/wx'
import { spawnPromisify } from '../share/fns'
import { Stdout, WxParcelQrCodeCallback } from '../types'

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
  private command: (params?: Array<string>, options?: SpawnOptions, stdout?: Stdout) => Promise<any>

  constructor (options: OptionManager) {
    this.options = options

    if (this.options.devToolServer) {
      const axiosOptions = {
        baseURL: options.devToolServer,
        interceptors: {
          response: responseInterceptors
        }
      }
  
      this.request = axios.create(axiosOptions)

    } else if (this.options.devToolCli) {
      this.command = async (params?: Array<string>, options?: SpawnOptions, stdout?: Stdout) => {
        const code = await spawnPromisify(this.options.devToolCli, params, options, stdout)
        if (code !== 0) {
          return Promise.reject(new Error(`Command ${params} fail, error code: ${code}`))
        }
      }
    }
  }

  /**
   * 登陆
   * 
   * @param qrcodeCallback 二维码处理回调
   */
  public async login (qrcodeCallback: WxParcelQrCodeCallback): Promise<any> {
    const task = async (statsFile) => {
      if (this.request) {
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

      } else if (this.command) {
        const { uid, qrcodePath } = this.options
        const qrcodeFile = path.join(qrcodePath, uid)

        fs.ensureDirSync(qrcodePath)

        const params = [
          '--login',
          '--login-qr-output', `base64@${qrcodeFile}`,
          '--login-result-output', `${statsFile}`
        ]
    
        await this.command(params)

        let qrcode = fs.readFileSync(qrcodeFile).toString()
        qrcodeCallback(qrcode)
      }
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

      if (this.request) {
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

      } else if (this.command) {
        const { uid, qrcodePath } = this.options
        const qrcodeFile = path.join(qrcodePath, uid)

        fs.ensureDirSync(qrcodePath)

        const params = [
          '--preview', folder,
          '--preview-qr-output', `base64@${qrcodeFile}`,
          '--preview-info-output', statsFile
        ]
    
        await this.command(params)

        let qrcode = fs.readFileSync(qrcodeFile).toString()
        qrcodeCallback(qrcode)
      }
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

      if (this.request) {
        const params = {
          projectpath: folder,
          version: version,
          desc: description,
          infooutput: statsFile
        }
  
        await this.request.get('/upload', { params })

      } else if (this.command) {
        const params = [
          '--upload', `${version}@${folder}`,
          '--upload-desc', encodeURIComponent(description),
          '--upload-info-output', statsFile
        ]
    
        await this.command(params)
      }
    }

    return await this.execTask(task)
  }

  /**
   * 自动预览
   * 
   * @param folder 项目文件夹
   */
  public async autoPreview (folder: string): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      if (this.request) {
        const params = {
          projectpath: folder,
          infooutput: statsFile
        }
  
        await this.request.get('/autopreview', { params })

      } else if (this.command) {
        const params = [
          '--auto-preview', folder,
          '--auto-preview-info-output', statsFile
        ]
    
        await this.command(params)
      }
    }

    return await this.execTask(task)
  }

  private async execTask (task: (statsFile: string) => void): Promise<any> {
    const { tempPath, uid } = this.options
    const statsFile = path.join(tempPath, `./stats/${uid}.json`)
    fs.ensureFileSync(statsFile)

    return new Promise(async (resolve, reject) => {
      let watchFile = (eventType: string) => {
        switch (eventType) {
          case 'change': {
            watcher.close()

            try {
              let content = fs.readJSONSync(statsFile)
              fs.removeSync(statsFile)
              resolve(content)

            } catch (error) {
              reject(new Error(error))
            }
          }
        }
      }
      
      let watcher = fs.watch(statsFile, { persistent: true }, watchFile)
      await task(statsFile)
    })
  }
}
