import * as http from 'http'
import pathToRegexp = require('path-to-regexp')
import Connection from './Connection'
import { ServerMiddle, ServerRouteHandle } from '../types'

export default class Server {
  private middlewares: Array<ServerMiddle>
  private server: http.Server

  constructor () {
    this.middlewares = []

    this.server = http.createServer(async (request, response) => {
      if (request.url === '/favicon.ico') {
        return
      }

      const connection = new Connection(request, response)

      try {
        await this.waterfall(this.middlewares)(connection, request, response)
        response.end()

      } catch (error) {
        connection.setCros()
        connection.setStatus(500)
        connection.toJson()
      }
    })
  }

  public route (methods: string | Array<string>, route: string, handle: ServerRouteHandle): void {
    return this.use(async (connection: Connection, clientRequest) => {
      const regexp = pathToRegexp(route)
      const params = regexp.exec(clientRequest.url)

      if (params) {
        methods = methods || 'GET'
        methods = Array.isArray(methods) ? methods : [methods]

        connection.setMethods(methods)
        connection.setCros()

        if (connection.status !== 200) {
          connection.toJson()
          return true
        }

        await handle(params, connection)
        return true
      }
    })
  }

  public use (middleware: ServerMiddle): void {
    this.middlewares.push(middleware)
  }

  public listen (...args): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.listen(...args)
  }

  public close (): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.close()
  }

  private waterfall (middlewares: Array<ServerMiddle>) {
    middlewares = [].concat(middlewares)

    return function waterfall (connection: Connection, request: http.IncomingMessage, response: http.ServerResponse) {
      if (middlewares.length === 0) {
        return Promise.resolve()
      }

      let middleware = middlewares.shift()
      return middleware(connection, request, response).then((isBreak: boolean) => {
        if (isBreak === true) {
          return Promise.resolve()
        }

        return waterfall(connection, request, response)
      })
    }
  }
}

