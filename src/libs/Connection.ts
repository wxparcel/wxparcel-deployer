import { IncomingMessage, ServerResponse as HttpServerResponse } from 'http'
import defaultsDeep = require('lodash/defaultsDeep')
import pick = require('lodash/pick')
import { ServerResponse } from '../types'

export default class Connection {
  public request: IncomingMessage
  public response: HttpServerResponse
  private head: { [key: string]: string }
  private status: number

  constructor (request: IncomingMessage, response: HttpServerResponse) {
    this.request = request
    this.response = response

    this.head = {}
    this.status = 200
  }

  public setCros (): void {
    this.writeHead('Access-Control-Allow-Credentials', 'true')
  }

  public setMethods (methods: Array<string>): void {
    this.writeHead('Access-Control-Allow-Methods', methods.join(',').toUpperCase())

    let method = this.request.method.toUpperCase()
    methods.indexOf(method) === -1 && this.setStatus(405)
  }

  public writeHead (key: string, value: string): void {
    this.head[key] = value
  }

  public setStatus (status: number): void {
    this.status = status
  }

  public toJson (response: any = {}) {
    response = this.arrangeJsonResponse(response)

    let body = JSON.stringify({ ...response, status: this.status })
    this.writeHead('Content-Type', 'application/json;charset=utf-8')
    this.writeHead('Content-Length', body.length + '')

    this.response.writeHead(this.status, this.head)
    this.response.end(body)
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
      case 404:
        return 'Not Found'
      case 405:
        return 'Method Not Allowed'
    }

    return 'ok'
  }
}
