import fs = require('fs-extra')
import path = require('path')
import isPlainObject = require('lodash/isPlainObject')
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import OptionManager from '../server/OptionManager'
import { findPages, validProject } from '../share/wx'
import { DevToolQRCodeHandle, CommandError, DevToolCommand } from '../typings'

export default class DevTool {
  private options: OptionManager
  private warders: Array<{ token: Symbol, kill: () => void }>
  private request: AxiosInstance

  constructor (options: OptionManager) {
    this.options = options
    this.warders = []

    const axiosOptions = {
      baseURL: options.devToolServer
    }

    const ResponseInterceptor = (response: AxiosResponse) => {
      const { status, data: message } = response
      if (status === 200) {
        return Promise.resolve(response)
      }

      return Promise.reject(new Error(message))
    }

    const RejectionInterceptor = (rejection: AxiosError) => {
      const { response } = rejection
      if (!response) {
        return Promise.reject(new Error('request could not be sent, please check the network status or server status'))
      }

      if (isPlainObject(response.data)) {
        const { code, error: message } = response.data
        const error: CommandError = new Error(message)
        error.code = code

        return Promise.reject(error)
      }

      return Promise.reject(new Error(response.data))
    }

    this.request = axios.create(axiosOptions)
    this.request.interceptors.response.use(ResponseInterceptor, RejectionInterceptor)
  }

  public open (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const params = {
      projectpath: encodeURIComponent(folder)
    }

    return this.request.get('/open', { params })
  }

  public login (qrcodeCallback: DevToolQRCodeHandle): Promise<any> {
    const { uid, qrcodePath } = this.options
    const qrcodeFile = path.join(qrcodePath, uid)

    fs.ensureFileSync(qrcodeFile)

    this.watchFile(qrcodeFile).then((qrcode: Buffer) => {
      qrcodeCallback(qrcode)
      fs.removeSync(qrcodeFile)
    })

    const command: DevToolCommand = (statsFile: string) => {
      const params = {
        format: 'base64',
        qroutput: encodeURIComponent(qrcodeFile),
        resultoutput: encodeURIComponent(statsFile)
      }

      return this.request.get('/login', { params })
    }

    return this.execute(command)
  }

  public preview (folder: string, qrcodeCallback: DevToolQRCodeHandle): Promise<any> {
    const command: DevToolCommand = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const pages = await findPages(folder)
      const params = {
        format: 'base64',
        projectpath: encodeURIComponent(folder),
        infooutput: statsFile,
        compilecondition: {
          pathName: pages[0]
        }
      }

      return this.request.get('/preview', { params }).then((response) => {
        const { data: qrcode } = response
        qrcodeCallback(`data:image/jpeg;base64,${qrcode}`)
        return response
      })
    }

    return this.execute(command)
  }

  public upload (folder: string, version: string, description: string): Promise<any> {
    const command: DevToolCommand = (statsFile) => {
      const params = {
        projectpath: encodeURIComponent(folder),
        version: version,
        desc: description,
        infooutput: statsFile
      }

      return this.request.get('/upload', { params })
    }

    return this.execute(command)
  }

  public quit (): Promise<any> {
    return this.request.get('/quit')
  }

  private execute (command: DevToolCommand, killToken?: symbol) {
    const { tempPath, uid } = this.options

    let statsFile = path.join(tempPath, `./stats/${uid}.json`)
    fs.ensureFileSync(statsFile)

    /**
     * 此处 kill token 防止返回后并没有任何 file change 事件触发的
     * 错误情况发生
     */
    let watchKillToken = Symbol()
    let statsPromise = this.watchFile(statsFile, watchKillToken)
    let excePromise = command(statsFile, killToken)

    const handleSuccess = (response) => {
      let [content] = response

      fs.removeSync(statsFile)
      return JSON.parse(content.toString())
    }

    const catchError = (error) => {
      this.kill(watchKillToken)

      fs.removeSync(statsFile)
      return Promise.reject(error)
    }

    return Promise.all([statsPromise, excePromise]).then(handleSuccess).catch(catchError)
  }

  private watchFile (file: string, killToken: symbol = Symbol('kill token')): Promise<Buffer> {
    if (!fs.existsSync(file)) {
      return Promise.reject(new Error(`File ${file} is not exists`))
    }

    return new Promise((resolve, reject) => {
      let watcher = fs.watch(file, { persistent: true }, (eventType: string) => {
        switch (eventType) {
          case 'change': {
            watcher.close()

            try {
              let content = fs.readFileSync(file)
              resolve(content)

            } catch (error) {
              reject(new Error(error))
            }
          }
        }
      })

      let kill = () => watcher.close()
      this.warders.push({ token: killToken, kill })
    })
  }

  private kill (killToken?: Symbol) {
    if (!Array.isArray(this.warders)) {
      return
    }

    let index = this.warders.findIndex(({ token }) => token === killToken)

    if (index !== -1) {
      this.warders[index].kill()
      this.warders.splice(index, 1)
    }
  }

  public destroy (): void {
    let warders = this.warders.splice(0)
    warders.forEach((warder) => warder.kill())

    this.options = undefined
    this.warders = undefined

    this.destroy = Function.prototype as any
  }
}
