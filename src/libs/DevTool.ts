import fs = require('fs-extra')
import path = require('path')
import { SpawnOptions } from 'child_process'
import axios, { AxiosInstance } from 'axios'
import { ServerOptions } from './OptionManager'
import { validProject, findPages } from '../share/wx'
import { spawnPromisify, killToken as genKillToken, killProcess } from '../share/fns'
import { Stdout, DevToolQRCodeHandle, CommandError } from '../typings'

const responseInterceptors = (response) => {
  const { status, data: message } = response
  if (status === 200) {
    return Promise.resolve(response)
  }

  return Promise.reject(new Error(message))
}

export default class DevTool {
  private options: ServerOptions
  private request: AxiosInstance
  private warders: Array<{ token: Symbol, kill: () => void }>

  constructor (options: ServerOptions) {
    this.options = options
    this.warders = []

    if (this.options.devToolServer) {
      const axiosOptions = {
        baseURL: options.devToolServer,
        interceptors: {
          response: responseInterceptors
        }
      }

      this.request = axios.create(axiosOptions)
    }
  }

  /**
   * 打开工具或指定项目
   *
   * @param folder 项目文件夹
   */
  public async open (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    if (this.request) {
      const params = {
        projectpath: encodeURIComponent(folder)
      }

      await this.request.get('/open', { params })

    } else if (this.command) {
      const params = [
        '--open', folder
      ]

      await this.command(params)
    }
  }

  /**
   * 登陆
   *
   * @param qrcodeCallback 二维码处理回调
   */
  public async login (qrcodeCallback: DevToolQRCodeHandle): Promise<any> {
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

        await this.command(params, null, null)

        let qrcode = fs.readFileSync(qrcodeFile).toString()
        qrcodeCallback(qrcode)
      }
    }

    const response = await this.execute(task)
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
  public async preview (folder: string, qrcodeCallback: DevToolQRCodeHandle): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      if (this.request) {
        const pages = await findPages(folder)

        const params = {
          format: 'base64',
          projectpath: encodeURIComponent(folder),
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

    return this.execute(task)
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
          projectpath: encodeURIComponent(folder),
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

    return this.execute(task)
  }

  /**
   * 自动化测试
   *
   * @param folder 项目文件夹
   */
  public async test (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    if (this.request) {
      const params = {
        projectpath: encodeURIComponent(folder)
      }

      await this.request.get('/test', { params })

    } else if (this.command) {
      const params = [
        '--test', folder
      ]

      await this.command(params)
    }
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
          projectpath: encodeURIComponent(folder),
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

    return this.execute(task)
  }

  /**
   * 关闭当前项目窗口
   *
   * @param folder 项目文件夹
   */
  public async close (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    if (this.request) {
      const params = {
        projectpath: encodeURIComponent(folder)
      }

      await this.request.get('/close', { params })

    } else if (this.command) {
      const params = [
        '--close', folder
      ]

      await this.command(params)
    }
  }

  /**
   * 关闭开发者工具
   */
  public async quit (): Promise<any> {
    if (this.request) {
      await this.request.get('/quit')

    } else if (this.command) {
      const params = [
        '--quit'
      ]

      await this.command(params)
    }
  }

  private async execute (task: (statsFile: string) => Promise<any>): Promise<any> {
    const { tempPath, uid } = this.options
    const statsFile = path.join(tempPath, `./stats/${uid}.json`)
    fs.ensureFileSync(statsFile)

    let killToken = genKillToken()
    let promise = this.watchFile(statsFile, killToken)
    await task(statsFile).catch((error) => {
      this.kill(killToken)
      return Promise.reject(error)
    })

    let content = await promise.catch((error) => {
      this.kill(killToken)
      return Promise.reject(error)
    })

    return JSON.parse(content.toString())
  }

  private watchFile (file: string, killToken?: Symbol): Promise<Buffer> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not exists`))
    }

    return new Promise((resolve, reject) => {
      let handle = function handle (eventType: string) {
        switch (eventType) {
          case 'change': {
            watcher.close()
            clearTimeout(timeId)

            try {
              let content = fs.readFileSync(file)
              resolve(content)

            } catch (error) {
              reject(new Error(error))
            }
          }
        }
      }

      let watcher = fs.watch(file, { persistent: true }, handle)

      let timeout = () => {
        this.kill(killToken)

        let error = new Error('Timeout') as CommandError
        error.code = -408

        reject(error)
      }

      let timeId = setTimeout(timeout, 30e3)
      killToken && this.warders.push({ token: killToken, kill: () => watcher.close() })

      let handleProcessSigint = process.exit.bind(process)
      let handleProcessExit = async () => {
        watcher && await watcher.close()

        process.removeListener('exit', handleProcessExit)
        process.removeListener('SIGINT', handleProcessSigint)

        handleProcessExit = undefined
        handleProcessSigint = undefined
      }

      process.on('exit', handleProcessExit)
      process.on('SIGINT', handleProcessSigint)
    })
  }

  private async command (params?: Array<string>, options?: SpawnOptions, stdout?: Stdout, killToken: Symbol = genKillToken()) {
    return new Promise(async (resolve, reject) => {
      console.log('fuck')
      // const { devToolCli } = this.options

      // let timeout = () => {
      //   this.kill(killToken)

      //   let error = new Error('Timeout') as CommandError
      //   error.code = -408

      //   reject(error)
      // }

      // let timeId = setTimeout(timeout, 30e3)
      // this.warders.push({ token: killToken, kill: () => killProcess(killToken) })

      // const code = await spawnPromisify(devToolCli, params, options, stdout, killToken)
      // clearTimeout(timeId)

      // if (code !== 0) {
      //   let error = new Error(`Command ${params} fail, error code: ${code}`) as CommandError
      //   error.code = code

      //   reject(error)
      //   return
      // }

      resolve(0)
    })
  }

  private kill (killToken?: Symbol) {
    let index = this.warders.findIndex(({ token }) => token === killToken)

    if (index !== -1) {
      this.warders[index].kill()
      this.warders.splice(index, 1)
    }
  }
}
