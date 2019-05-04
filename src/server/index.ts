import OptionManager from './OptionManager'
import DevTool from '../libs/DevTool'
import Http from './Http'
import WebSocket from './WebSocket'

export default class Server {
  private options: OptionManager
  private devTool: DevTool
  private httpServ: Http
  private socketServ: WebSocket

  constructor (options: OptionManager) {
    this.options = options

    this.devTool = new DevTool(this.options)
    this.httpServ = new Http(this.options, this.devTool)
    this.socketServ = new WebSocket(this.options, this.devTool)
  }

  public start (): Promise<void> {
    const { httpServer } = this.httpServ
    this.socketServ.start(httpServer)
    return this.httpServ.start()
  }

  public destroy (): void {
    this.devTool.destroy()
    this.httpServ.destroy()
    this.socketServ.destroy()

    this.devTool = null
    this.httpServ = null
    this.socketServ = null

    this.destroy = Function.prototype as any
  }
}
