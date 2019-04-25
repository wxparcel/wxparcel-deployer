import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import Queue from '../services/queue'
import { killToken as genKillToken, killProcess } from '../share/fns'

import { CommandError, StandardJSONResponse } from '../typings'

export default class Service {
  private killTokens: Array<symbol>

  get idle () {
    return Queue.size === 0
  }

  constructor () {
    this.killTokens = []
  }

  public execute (command: (killToken: symbol) => Promise<void>, killToken?: symbol): Promise<void> {
    const execute = () => {
      const removeKillToken = (killToken: symbol) => {
        if (Array.isArray(this.killTokens)) {
          let index = this.killTokens.findIndex((token) => token === killToken)
          index === -1 && this.killTokens.splice(index, 1)
        }
      }

      const handleComplete = (response) => {
        removeKillToken(killToken)
        return response
      }

      const handleError = (error) => {
        removeKillToken(killToken)
        return Promise.reject(error)
      }

      killToken = killToken || genKillToken()
      this.killTokens.push(killToken)

      const promise = command(killToken).then(handleComplete).catch(handleError)
      Queue.push(promise)

      return promise
    }

    if (Queue.size > 0) {
      return execute()
    }

    return Promise.all(Queue.promise).then(execute)
  }

  // public log (message: string, ...args: Array<string>): void {
  //   const prefix = args.map((value) => `[${chalk.green.bold(value)}]`)
  //   const datetime = chalk.gray(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''))
  //   stdoutServ.info(`${prefix.length ? prefix.join(' ') + ' ' : ''}${message && message + ' '}${datetime}`)
  // }

  public genStandardResponse (content: StandardJSONResponse): StandardJSONResponse {
    let response = this.genDefaultResponse(content.status)
    let keys = Object.keys(response)
    content = pick(content, keys)

    return defaultsDeep(content, response)
  }

  public genDefaultResponse (status: number = 200): StandardJSONResponse {
    let code = 0
    let data = null
    let message = this.genMessageByStatus(status)

    return { status, code, data, message }
  }

  public genMessageByStatus (status: number): string {
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

  public resolveCommandError (error: CommandError): StandardJSONResponse {
    switch (error.code) {
      case 255: {
        let status = 520
        let message = 'Operation fail, please retry'
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

  public destroy (): void {
    if (Array.isArray(this.killTokens)) {
      let killTokens = this.killTokens.splice(0)
      killTokens.forEach((killToken) => killProcess(killToken))
    }

    this.killTokens = undefined
  }
}
