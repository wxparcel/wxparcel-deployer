import http = require('http')
import pathToRegexp = require('path-to-regexp')
import chalk from 'chalk'
import Connection from './Connection'
import stdoutServ from '../services/stdout'
import { ServerMiddle, ServerRouteHandle } from '../typings'

export default class Server {
  private routes: Array<ServerMiddle>
  private middlewares: Array<ServerMiddle>
  private server: http.Server

  constructor () {
    this.routes = []
    this.server = http.createServer(async (request, response) => {
      if (request.url === '/favicon.ico') {
        return
      }

      const connection = new Connection(request, response)

      try {
        await this.waterfall(this.middlewares)(connection, request, response)
        const hit = await this.waterfall(this.routes)(connection, request, response)

        if (hit !== true) {
          const { method, url } = request
          const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
          stdoutServ.warn(`[${chalk.gray('MISS')}][${chalk.green(method.toUpperCase())}] ${url} ${datetime}`)

          connection.setStatus(404)
          connection.toJson()
        }

        response.finished || response.end()

      } catch (error) {
        connection.setCros()
        connection.setStatus(500)
        connection.toJson()
      }
    })
  }

  public route (methods: string | Array<string>, route: string, handle: ServerRouteHandle): void {
    methods = methods || 'GET'
    methods = Array.isArray(methods) ? methods : [methods]

    const router = async (connection: Connection, clientRequest) => {
      const { url, method } = clientRequest
      const regexp = pathToRegexp(route)
      const params = regexp.exec(url)

      if (params) {
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.info(`[${chalk.gray('HIT')}][${chalk.green(method.toUpperCase())}] ${url} ${chalk.gray(datetime)}`)

        connection.setMethods(methods as Array<string>)
        connection.setCros()

        if (connection.status !== 200) {
          connection.toJson()
          connection.destroy()
          return true
        }

        try {
          await handle(params, connection)

        } catch (error) {
          stdoutServ.error(error)

          connection.setStatus(500)
          connection.toJson({ message: error.message })
          connection.destroy()
        }

        return true
      }
    }

    this.routes.push(router)
  }

  public use (middleware: ServerMiddle) {
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

  private waterfall (middlewares: Array<ServerMiddle>): (connection: Connection, request: http.IncomingMessage, response: http.ServerResponse) => Promise<boolean> {
    middlewares = [].concat(middlewares)

    return function waterfall (connection: Connection, request: http.IncomingMessage, response: http.ServerResponse): Promise<boolean> {
      if (middlewares.length === 0) {
        return Promise.resolve(false)
      }

      let middleware = middlewares.shift()
      return middleware(connection, request, response).then((isBreak: boolean) => {
        if (isBreak === true) {
          return Promise.resolve(true)
        }

        return waterfall(connection, request, response)
      })
    }
  }

  public destory () {
    this.routes.splice(0)
    this.server.close()

    this.routes = null
    this.server = null
  }
}
