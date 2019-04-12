import Socket = require('socket.io-client')
import { ServerOptions } from '../libs/OptionManager'
import HttpServer from '../libs/http/Server'
import Connection from '../libs/http/Connection'
import Service from '../libs/Service'

export default class Distributor extends Service {
  private options: ServerOptions
  public server: HttpServer

  constructor (options: ServerOptions) {
    super()

    this.options = options
    this.server = new HttpServer()
  }
}
