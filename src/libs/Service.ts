import chalk from 'chalk'
import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import stdoutServ from '../services/stdout'
import { CommandError, StandardResponse } from '../typings'

export default class Server {
  private queue: Array<Promise<any>>

  get idle () {
    return this.queue.length === 0
  }

  constructor () {
    this.queue = []
  }

  public async execute (command: () => Promise<void>): Promise<void> {
    this.queue.length > 0 && await Promise.all(this.queue)

    const promise = command()
    this.pushQueue(promise)
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
    this.queue.splice(index, 1)
  }

  public logger (uid: string): (message: string) => void {
    return (message) => {
      const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      stdoutServ.info(`[${chalk.green.bold(uid)}] ${message} ${chalk.gray(datetime)}`)
    }
  }

  public destory (): void {
    this.queue.splice(0)
    this.queue = undefined
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
        let message = 'You don\'t have permission to upload'
        return { status, message }
      }

      case -408: {
        let status = 408
        let message = 'Upload timeout, please retry'
        return { status, message }
      }

      default: {
        let status = error.code
        let message = `Command fail with error code: ${error.code}`
        return { status, message }
      }
    }
  }
}