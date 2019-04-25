import http = require('http')
import pathToRegexp = require('path-to-regexp')
import chalk from 'chalk'
import Connection from './Connection'
import StdoutServ from '../services/stdout'

import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { Router, RouterHandle } from '../typings'

export default class Server {
  private routes: Array<Router>
  public server: HttpServer

  constructor () {
    this.routes = []
    this.server = http.createServer(this.connect.bind(this))
  }

  private connect (request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.url === '/favicon.ico') {
      response.end()
      return Promise.resolve()
    }

    const logger = () => {
      const url = request.url
      const method = request.method.toUpperCase()
      const format = chalk.cyanBright.bind(chalk)
      return StdoutServ.dateime().head(method, format).head(response.statusCode + '', format).write(url)
    }

    const handleSuccess = () => {
      logger().ok()
      response.finished || response.end()
    }

    const handleError = (error) => {
      logger().error(error)
      return Promise.reject(error)
    }

    let exec = this.waterfall(this.routes)
    return exec(request, response).then(handleSuccess).catch(handleError)
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

  public route (methods: string | Array<string>, route: string, handle: RouterHandle): void {
    methods = methods || 'GET'
    methods = Array.isArray(methods) ? methods : [methods]

    const router: Router = (request, response): Promise<Boolean> => {
      const url = request.url
      const regexp = pathToRegexp(route)
      const params = regexp.exec(url)

      if (!params) {
        return Promise.resolve(false)
      }

      const handleSuccess = () => {
        StdoutServ.dateime().head('HIT', chalk.greenBright.bind(chalk)).write(url).write(route).ok()
        connection.destroy()
        return true
      }

      const handleError = (error) => {
        StdoutServ.dateime().head('HIT', chalk.greenBright.bind(chalk)).error(error)
        connection.destroy()
        return error
      }

      const connection = new Connection(request, response)
      connection.setMethods(methods as Array<string>)
      connection.setCros()

      return handle(params, connection).then(handleSuccess).catch(handleError)
    }

    this.routes.push(router)
  }

  public close (): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.close()
  }

  private waterfall (middlewares: Array<(...args) => Promise<any>>) {
    middlewares = [].concat(middlewares)

    return function waterfall (request: IncomingMessage, response: ServerResponse): Promise<boolean> {
      if (middlewares.length === 0) {
        return Promise.resolve(false)
      }

      let middleware = middlewares.shift()
      return middleware(request, response).then((isBreak: boolean) => {
        if (isBreak === true) {
          return Promise.resolve(true)
        }

        return waterfall(request, response)
      })
    }
  }

  public destroy () {
    this.routes.splice(0)
    this.server.close()

    this.routes = undefined
    this.server = undefined
  }
}
