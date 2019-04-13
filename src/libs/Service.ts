import chalk from 'chalk'
import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import stdoutServ from '../services/stdout'
import { killToken as genKillToken, killProcess } from '../share/fns'
import { CommandError, StandardResponse } from '../typings'

export default class Service {
  private queue: Array<Promise<any>>
  private killTokens: Array<symbol>

  get idle () {
    return this.queue.length === 0
  }

  constructor () {
    this.queue = []
    this.killTokens = []
  }

  public async execute (command: (killToken: symbol) => Promise<void>): Promise<void> {
    this.queue.length > 0 && await Promise.all(this.queue)

    const killToken = genKillToken()

    const removeKillToken = (killToken: symbol) => {
      let index = this.killTokens.findIndex((token) => token === killToken)
      index === -1 && this.killTokens.splice(index, 1)
    }

    const promise = command(killToken)
      .then((response) => {
        removeKillToken(killToken)
        return response
      })
      .catch((error) => {
        removeKillToken(killToken)
        return Promise.reject(error)
      })

    this.pushQueue(promise)
    this.killTokens.push(killToken)

    await promise
  }

  public pushQueue (...promises: Array<Promise<void>>) {
    let filterAndBindings = (promise) => {
      if (promise instanceof Promise) {
        let removeQueue = this.removeQueue.bind(this, promise)
        promise.then(removeQueue).catch(removeQueue)
        return true
      }

      return false
    }

    promises = promises.filter(filterAndBindings)
    this.queue.push(...promises)
  }

  public removeQueue (promise: Promise<void>) {
    let index = this.queue.indexOf(promise)
    index !== -1 && this.queue.splice(index, 1)
  }

  public log (message: string, ...args: Array<string>): void {
    const prefix = args.map((value) => `[${chalk.green.bold(value)}]`)
    const datetime = chalk.gray(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''))
    stdoutServ.info(`${prefix.length ? prefix.join(' ') + ' ' : ''}${message && message + ' '}${datetime}`)
  }

  public standard (content: StandardResponse): StandardResponse {
    let response = this.genDefaultResponse(content.status)
    let keys = Object.keys(response)
    content = pick(content, keys)

    return defaultsDeep(content, response)
  }

  public genDefaultResponse (status: number = 200): StandardResponse {
    let code = 0
    let data = null
    let message = this.getMessageByStatus(status)

    return { status, code, data, message }
  }

  public getMessageByStatus (status: number): string {
    switch (status) {
      case 200:
        return 'OK'
      case 401:
        return 'Unauthorized'
      case 404:
        return 'Not Found'
      case 405:
        return 'Method Not Allowed'
      case 408:
        return 'Request Timeout'
    }

    return 'ok'
  }

  public resolveCommandError (error: CommandError): StandardResponse {
    switch (error.code) {
      case 255: {
        let status = 401
        let message = 'You don\'t have permission'
        return { status, message }
      }

      case -408: {
        let status = 408
        let message = 'Operation timeout, please retry'
        return { status, message }
      }

      default: {
        let status = error.code
        let message = `Command fail with error code: ${error.code}`
        return { status, message }
      }
    }
  }

  public getQueue (): Array<Promise<any>> {
    return [].concat(this.queue)
  }

  public destory (): void {
    this.queue && this.queue.splice(0)

    let killTokens = this.killTokens.splice(0)
    killTokens.forEach((killToken) => killProcess(killToken))

    this.queue = undefined
    this.killTokens = undefined
  }
}
