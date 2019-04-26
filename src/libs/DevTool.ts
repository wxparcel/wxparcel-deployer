import fs = require('fs-extra')
import path = require('path')
import { SpawnOptions } from 'child_process'
import OptionManager from '../server/OptionManager'
import { validProject } from '../share/wx'
import { spawnPromisify, killToken as genKillToken, killProcess } from '../share/fns'
import { Stdout, DevToolQRCodeHandle, CommandError } from '../typings'

export default class DevTool {
  private options: OptionManager
  private warders: Array<{ token: Symbol, kill: () => void }>

  constructor (options: OptionManager) {
    this.options = options
    this.warders = []
  }

  public open (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const params = [
      '--open', folder
    ]

    return this.command(params)
  }

  public login (qrcodeCallback: DevToolQRCodeHandle, killToken?: symbol): Promise<any> {
    const { uid, qrcodePath } = this.options
    const qrcodeFile = path.join(qrcodePath, uid)

    fs.ensureFileSync(qrcodeFile)

    this.watchFile(qrcodeFile).then((qrcode: Buffer) => {
      qrcodeCallback(qrcode)
      fs.removeSync(qrcodeFile)
    })

    const command = (statsFile: string, killToken: symbol) => {
      const params = [
        '--login',
        '--login-qr-output', `base64@${qrcodeFile}`,
        '--login-result-output', `${statsFile}`
      ]
      return this.command(params, null, null, killToken)
    }

    return this.execute(command, killToken).then((response) => {
      if (response.status !== 'SUCCESS') {
        return Promise.reject(new Error(response.error))
      }

      return response
    })
  }

  public preview (folder: string, qrcodeCallback: DevToolQRCodeHandle, killToken?: symbol): Promise<any> {
    const command = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

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

    return this.execute(command, killToken)
  }

  public upload (folder: string, version: string, description: string, killToken?: symbol): Promise<any> {
    const command = (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const params = [
        '--upload', `${version}@${folder}`,
        '--upload-desc', encodeURIComponent(description),
        '--upload-info-output', statsFile
      ]

      return this.command(params)
    }

    return this.execute(command, killToken)
  }

  public test (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const params = [
      '--test', folder
    ]

    return this.command(params)
  }

  public autoPreview (folder: string, killToken?: symbol): Promise<any> {
    const task = async (statsFile) => {
      const valid = validProject(folder)
      if (valid !== true) {
        return Promise.reject(valid)
      }

      const params = [
        '--auto-preview', folder,
        '--auto-preview-info-output', statsFile
      ]

      await this.command(params)
    }

    return this.execute(task, killToken)
  }

  public close (folder: string): Promise<any> {
    const valid = validProject(folder)
    if (valid !== true) {
      return Promise.reject(valid)
    }

    const params = [
      '--close', folder
    ]

    return this.command(params)
  }

  public quit (): Promise<any> {
    const params = [
      '--quit'
    ]

    return this.command(params)
  }

  private execute (task: (statsFile: string, killToken: symbol) => Promise<any>, killToken?: symbol) {
    const { tempPath, uid } = this.options

    let statsFile = path.join(tempPath, `./stats/${uid}.json`)
    fs.ensureFileSync(statsFile)

    let watchKillToken = genKillToken()
    let statsPromise = this.watchFile(statsFile, watchKillToken)
    let excePromise = task(statsFile, killToken)

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

  private watchFile (file: string, killToken: symbol = genKillToken()): Promise<Buffer> {
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

  private command (params?: Array<string>, options?: SpawnOptions, stdout?: Stdout, killToken: symbol = genKillToken()): Promise<any> {
    const { devToolCli } = this.options

    const kill = () => killProcess(killToken)
    this.warders.push({ token: killToken, kill })

    return this.spawn(devToolCli, params, options, stdout, killToken)
  }

  private spawn (command?: string, params?: Array<string>, options?: SpawnOptions, stdout?: Stdout, killToken?: symbol): Promise<any> {
    return spawnPromisify(command, params, options, stdout, killToken).then((code) => {
      this.kill(killToken)

      if (code !== 0) {
        let error = new Error(`Command ${command} ${params.join(' ')} fail, error code: ${code}`) as CommandError
        error.code = code

        return Promise.reject(error)
      }

      return code
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
