import { EventEmitter } from 'events'
import chalk from 'chalk'
import {
  StdoutOptions,
  LoggerTypes, LoggerFormat, LoggerHeads, LoggerMessages
} from '../typings'

export class Stdout extends EventEmitter {
  static TYPES: Array<LoggerTypes> = [
    LoggerTypes.LOG,
    LoggerTypes.OK,
    LoggerTypes.INFO,
    LoggerTypes.WARN,
    LoggerTypes.ERROR,
    LoggerTypes.CLEAR
  ]

  private name: string
  private options: StdoutOptions
  private heads: LoggerHeads
  private messages: LoggerMessages
  private _hasDatetime: boolean
  private autoDatetime: boolean

  private get hasDatetime () {
    if (this.autoDatetime === true) {
      return true
    }

    return this._hasDatetime
  }

  private set hasDatetime (value) {
    this._hasDatetime = this.autoDatetime === true ? true : !!value
  }

  constructor (name: string = '', options: StdoutOptions = {}) {
    super()

    this.name = name
    this.options = options
    this.heads = []
    this.messages = []
    this.autoDatetime = options.hasOwnProperty('autoDatetime') ? options.autoDatetime : true
  }

  public born (name: string = '', options: StdoutOptions = this.options): Stdout {
    const service = new Stdout(name, options)
    Stdout.TYPES.forEach((event) => service.on(event, (data) => this.emit(event, data)))
    return service
  }

  public head (content: string, format?: LoggerFormat): this {
    this.heads.push({ content, format })
    return this
  }

  public dateime (format: LoggerFormat = chalk.gray.bold, force: boolean = false): this {
    if (this.hasDatetime === true && force !== true) {
      return this
    }

    const content = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    this.heads.unshift({ content, format })
    this.hasDatetime = true

    return this
  }

  public type (content: string, format?: LoggerFormat): this {
    let index = this.hasDatetime === true ? 1 : 0
    this.heads.splice(index, 0, { content, format })
    return this
  }

  public log (message?: string | Error, format?: LoggerFormat): void {
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.LOG, chalk.white.bold)
  }

  public ok (message?: string | Error, format?: LoggerFormat): void {
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.OK, chalk.green.bold)
  }

  public info (message?: string | Error, format?: LoggerFormat): void {
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.INFO, chalk.cyan.bold)
  }

  public warn (message?: string | Error, format?: LoggerFormat): void {
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.WARN, chalk.yellow.bold)
  }

  public error (message?: string | Error, format?: LoggerFormat): void {
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.ERROR, chalk.red.bold)
  }

  public write (content: string | Error, format?: LoggerFormat): this {
    this.messages.push({ content, format })
    return this
  }

  public send (type: string = LoggerTypes.LOG, format?: LoggerFormat): this {
    if (this.autoDatetime === true) {
      this.dateime(chalk.gray.bold, true)
    }

    this.name && this.type(this.name, chalk.green.bold)
    this.type(type, format)

    let heads = this.heads.splice(0)
    let messages = this.messages.splice(0)
    this.emit(type, { heads, messages })

    this.hasDatetime = false
    return this
  }

  public clear (isSoft: boolean = true): void {
    this.emit(LoggerTypes.CLEAR, isSoft)
  }

  public loading (value: number, total: number, message: string): void {
    this.emit('loading', { value, total, message })
  }

  public destory (): void {
    this.removeAllListeners()

    this.heads.splice(0)
    this.messages.splice(0)

    this.heads = undefined
    this.messages = undefined
    this.hasDatetime = undefined

    this.destory = Function.prototype as any
  }
}

export default new Stdout()
