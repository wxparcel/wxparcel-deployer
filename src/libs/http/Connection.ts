import { IncomingMessage, ServerResponse } from 'http'
import { StandardResponse } from '../../typings'

export default class Connection {
  public request: IncomingMessage
  public response: ServerResponse
  public head: { [key: string]: string }
  public status: number
  public flush: boolean

  constructor (request: IncomingMessage, response: ServerResponse) {
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

  public writeJson (response?: StandardResponse): void {
    if (this.flush === true) {
      return
    }

    let body = JSON.stringify({ status: this.status, ...response })
    this.writeHead('Content-Type', 'application/json;charset=utf-8')
    this.writeHead('Content-Length', body.length + '')

    this.response.writeHead(response.status || this.status, this.head)
    this.response.end(body)
    this.flush = true
  }

  public destroy () {
    this.request = undefined
    this.response = undefined
    this.head = undefined
    this.status = undefined
    this.flush = undefined
  }
}
