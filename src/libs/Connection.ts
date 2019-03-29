import { IncomingMessage, ServerResponse as HttpServerResponse } from 'http'
import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import { ServerResponse } from '../types'

export default class Connection {
  public request: IncomingMessage
  public response: HttpServerResponse
  public head: { [key: string]: string }
  public status: number
  public flush: boolean

  constructor (request: IncomingMessage, response: HttpServerResponse) {
    this.request = request
    this.response = response

    this.head = {}
    this.status = 200
    this.flush = false
  }

  public setCros (): void {
    if (this.flush === true) {
      return
    }

    this.writeHead('Access-Control-Allow-Credentials', 'true')
  }

  public setMethods (methods: Array<string>): void {
    if (this.flush === true) {
      return
    }

    this.writeHead('Access-Control-Allow-Methods', methods.join(',').toUpperCase())

    let method = this.request.method.toUpperCase()
    methods.indexOf(method) === -1 && this.setStatus(405)
  }

  public writeHead (key: string, value: string): void {
    if (this.flush === true) {
      return
    }

    this.head[key] = value
  }

  public setStatus (status: number): void {
    if (this.flush === true) {
      return
    }

    this.status = status
  }

  public toJson (response: any = {}) {
    if (this.flush === true) {
      return
    }

    response = this.arrangeJsonResponse(response)

    let body = JSON.stringify({ ...response, status: this.status })
    this.writeHead('Content-Type', 'application/json;charset=utf-8')
    this.writeHead('Content-Length', body.length + '')

    this.response.writeHead(this.status, this.head)
    this.response.end(body)
    this.flush = true
  }

  private arrangeJsonResponse (content: any): ServerResponse {
    let response = this.genJsonResponse()
    let keys = Object.keys(response)
    content = pick(content, keys)

    return defaultsDeep(content, response)
  }

  private genJsonResponse (): ServerResponse {
    let status = this.status
    let code = 0
    let data = null
    let message = this.genMessage()

    return { status, code, data, message }
  }

  private genMessage (): string {
    switch (this.status) {
      case 200:
        return 'OK'
      case 401:
        return 'Unauthorized'
      case 404:
        return 'Not Found'
      case 405:
        return 'Method Not Allowed'
    }

    return 'ok'
  }

  public destroy () {
    this.request = undefined
    this.response = undefined
    this.head = undefined
    this.status = undefined
    this.flush = undefined
  }
}
