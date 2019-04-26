import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import Queue from '../services/queue'
import { CommandError, StandardJSONResponse, ServiceCommand } from '../typings'

export default class Service {
  get idle () {
    return Queue.size === 0
  }

  public async execute (command: ServiceCommand, killToken?: symbol): Promise<void> {
    if (Queue.idle === false) {
      await Queue.waitForIdle()
    }

    const promise = command(killToken)
    Queue.push(promise)
    return promise
  }

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
        let message = error.message || 'command fail, please retry'
        return { status, message }
      }

      case -408: {
        let status = 408
        let message = error.message || 'command timeout, please retry'
        return { status, message }
      }

      default: {
        let status = 500
        let message = error.message || `command fail with error code: ${error.code}`
        return { status, message }
      }
    }
  }
}
