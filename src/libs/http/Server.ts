import http = require('http')
import pathToRegexp = require('path-to-regexp')
import chalk from 'chalk'
import Connection from './Connection'
import stdoutServ from '../../services/stdout'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { HTTPServerRoute, HTTPServerRouteHandler } from '../../typings'

export default class Server {
  private routes: Array<HTTPServerRoute>
  public server: HttpServer

  constructor () {
    this.routes = []
    this.server = http.createServer(this.connect.bind(this))
  }

  public route (methods: string | Array<string>, route: string, handle: HTTPServerRouteHandler): void {
    methods = methods || 'GET'
    methods = Array.isArray(methods) ? methods : [methods]

    const router = async (connection: Connection, clientRequest) => {
      const { url, method } = clientRequest
      const regexp = pathToRegexp(route)
      const params = regexp.exec(url)

      if (params) {
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.info(`[${chalk.gray('HIT')}][${chalk.green.bold(method.toUpperCase())}] ${url} ${chalk.gray(datetime)}`)

        connection.setMethods(methods as Array<string>)
        connection.setCros()

        if (connection.status !== 200) {
          connection.writeJson()
          connection.destroy()
          return true
        }

        try {
          await handle(params, connection)

        } catch (error) {
          stdoutServ.error(error)

          connection.setStatus(500)
          connection.writeJson({ message: error.message })
          connection.destroy()
        }

        return true
      }
    }

    this.routes.push(router)
  }

  public listen (port: number, hostname?: string, backlog?: number): Promise<void> {
    if (!this.server) {
      return Promise.reject(new Error('Server is not running'))
    }

    return new Promise((resolve, reject) => {
      this.server.on('error', reject)
      this.server.listen(port, hostname, backlog, resolve)
    })
  }

  public close (): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.close()
  }

  private async connect (request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.url === '/favicon.ico') {
      return
    }

    const connection = new Connection(request, response)

    try {
      const hit = await this.waterfall(this.routes)(connection, request, response)

      if (hit !== true) {
        const { method, url } = request
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.warn(`[${chalk.gray('MISS')}][${chalk.green.bold(method.toUpperCase())}] ${url} ${datetime}`)

        connection.setStatus(404)
        connection.writeJson()
      }

      response.finished || response.end()

    } catch (error) {
      connection.setCros()
      connection.setStatus(500)
      connection.writeJson()
    }
  }

  private waterfall (middlewares: Array<(...args) => Promise<any>>): (...args) => Promise<boolean> {
    middlewares = [].concat(middlewares)

    return function waterfall (...args): Promise<boolean> {
      if (middlewares.length === 0) {
        return Promise.resolve(false)
      }

      let middleware = middlewares.shift()
      return middleware(...args).then((isBreak: boolean) => {
        if (isBreak === true) {
          return Promise.resolve(true)
        }

        return waterfall(...args)
      })
    }
  }

  public destory () {
    this.routes.splice(0)
    this.server.close()

    this.routes = undefined
    this.server = undefined
  }
}
