import { IncomingMessage, ServerResponse } from 'http'
import { StandardJSONResponse } from '../typings'

export default class Connection {
  public request: IncomingMessage
  public response: ServerResponse
  public head: { [key: string]: string }
  public status: number

  constructor (request: IncomingMessage, response: ServerResponse) {
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

  public endJson (response: StandardJSONResponse = {}): void {
    let status = response.status || this.status || 200
    let message = JSON.stringify({ status, ...response })

    this.writeHead('Content-Type', 'application/json;charset=utf-8')
    this.writeHead('Content-Length', message.length + '')

    this.response.writeHead(response.status || this.status, this.head)
    this.response.end(message)
  }

  public end (response: StandardJSONResponse = {}): void {
    let status = response.status || this.status || 200
    let message = response.message || ''

    this.writeHead('Content-Type', 'text/plain;charset=utf-8')
    this.writeHead('Content-Length', message.length + '')

    this.response.writeHead(status, this.head)
    this.response.end(message)
  }

  public destroy () {
    this.request = undefined
    this.response = undefined
    this.head = undefined
    this.status = undefined
  }
}
