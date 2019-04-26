import { IncomingMessage, ServerResponse } from 'http'
import { StandardJSONResponse } from '../typings'

export default class Connection {
  public request: IncomingMessage
  public response: ServerResponse
  public head: { [key: string]: string }
  public status: number
  public ended: boolean

  constructor (request: IncomingMessage, response: ServerResponse) {
    this.request = request
    this.response = response

    this.head = {}
    this.status = 200
    this.ended = false
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

  public end (response: StandardJSONResponse = {}): void {
    if (this.ended === true) {
      return
    }

    let contentType = this.request.headers['accept'] || ''
    let isJson = -1 !== contentType.search('application/json')

    let status = response.status || this.status || 200
    let message = isJson ? JSON.stringify({ status, ...response }) : response.message || ''

    this.writeHead('Content-Type', isJson ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8')
    this.writeHead('Content-Length', Buffer.from(message).byteLength + '')

    this.response.writeHead(status, this.head)
    this.response.end(message)

    this.ended = true
  }

  public destroy () {
    this.request = undefined
    this.response = undefined
    this.head = undefined
    this.status = undefined
  }
}
