import http = require('http')
import pathToRegexp = require('path-to-regexp')
import chalk from 'chalk'
import Connection from './Connection'
import StdoutServ, { Stdout } from '../services/stdout'

import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { Router, RouterHandle } from '../typings'

export default class Server {
  private stdout: Stdout
  private routes: Array<Router>
  private server: HttpServer

  get httpServer (): HttpServer {
    return this.server
  }

  constructor () {
    this.routes = []
    this.server = http.createServer(this.connect.bind(this))
    this.stdout = StdoutServ.born()
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

    const router: Router = (connection: Connection): Promise<Boolean> => {
      const { request } = connection
      const url = request.url
      const regexp = pathToRegexp(route)
      const params = regexp.exec(url)

      if (!params) {
        return Promise.resolve(false)
      }

      this.stdout.head('HIT', chalk.green.bold).write(url).write(route)

      const handleSuccess = () => {
        this.stdout.ok()

        connection.end()
        return true
      }

      const handleError = (error) => {
        this.stdout.error(error)

        connection.end({ status: 500, message: error.message })
        return Promise.reject(error)
      }

      connection.setMethods(methods as Array<string>)
      connection.setCros()

      return handle(params, connection).then(handleSuccess).catch(handleError)
    }

    this.routes.push(router)
  }

  private connect (request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.url === '/favicon.ico') {
      response.end()
      return Promise.resolve()
    }

    const handleSuccess = (hit: boolean) => {
      if (hit === false) {
        connection.setStatus(404)
        connection.end({ message: 'service is not found' })

      } else {
        connection.end({ message: 'ok' })
      }

      const method = request.method.toUpperCase()
      this.stdout.head(method, chalk.cyan.bold).write(connection.status + '').info(request.url)

      connection.destroy()
    }

    const handleError = (error) => {
      connection.end({ status: 500, message: error.message })
      connection.destroy()
    }

    let exec = this.waterfall(this.routes)
    let connection = new Connection(request, response)
    return exec(connection).then(handleSuccess).catch(handleError)
  }

  public close (): void {
    if (!this.server) {
      throw new Error('Server is not running')
    }

    this.server.close()
  }

  private waterfall (middlewares: Array<(...args) => Promise<any>>) {
    middlewares = [].concat(middlewares)

    return function waterfall (connection: Connection): Promise<boolean> {
      if (middlewares.length === 0) {
        return Promise.resolve(false)
      }

      let middleware = middlewares.shift()
      return middleware(connection).then((isBreak: boolean) => {
        if (isBreak === true) {
          return Promise.resolve(true)
        }

        return waterfall(connection)
      })
    }
  }

  public destroy () {
    this.routes.splice(0)
    this.server.close()
    this.stdout.destory()

    this.routes = undefined
    this.server = undefined
    this.stdout = undefined
  }
}
