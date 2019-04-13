import http = require('http')
import pathToRegexp = require('path-to-regexp')
import chalk from 'chalk'
import Connection from './Connection'
import stdoutServ from '../../services/stdout'
import { Server as HttpServer, IncomingMessage, ServerResponse } from 'http'
import { HTTPServerRoute, HTTPServerRouteHandler } from '../../typings'
import Service from '../Service'

export default class Server {
  private routes: Array<HTTPServerRoute>
  public server: HttpServer
  private service: Service

  constructor () {
    this.routes = []
    this.server = http.createServer(this.connect.bind(this))
    this.service = new Service()
  }

  public route (methods: string | Array<string>, route: string, handle: HTTPServerRouteHandler): void {
    methods = methods || 'GET'
    methods = Array.isArray(methods) ? methods : [methods]

    const router = async (connection: Connection) => {
      const { url, method } = connection.request
      const regexp = pathToRegexp(route)
      const params = regexp.exec(url)

      if (params) {
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.info(`[${chalk.gray('HIT')}][${chalk.green.bold(method.toUpperCase())}] ${url} ${chalk.gray(datetime)}`)

        connection.setMethods(methods as Array<string>)
        connection.setCros()

        if (connection.status !== 200) {
          let repsonse = this.service.standard(connection)
          connection.writeJson(repsonse)
          connection.destroy()
          return true
        }

        try {
          await handle(params, connection)

        } catch (error) {
          stdoutServ.error(error)

          let data = { status: 500, message: error.message }
          let repsonse = this.service.standard(data)
          connection.writeJson(repsonse)
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
      response.end()
      return
    }

    const connection = new Connection(request, response)

    try {
      const hit = await this.waterfall(this.routes)(connection)

      if (hit !== true) {
        const { method, url } = request
        const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
        stdoutServ.warn(`[${chalk.gray('MISS')}][${chalk.green.bold(method.toUpperCase())}] ${url} ${datetime}`)

        let data = { status: 404 }
        let repsonse = this.service.standard(data)
        connection.writeJson(repsonse)
      }

      response.finished || response.end()

    } catch (error) {
      connection.setCros()

      let data = { status: 500 }
      let repsonse = this.service.standard(data)
      connection.writeJson(repsonse)
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
    this.service.destory()

    this.routes = undefined
    this.server = undefined
    this.service = undefined
  }
}
