import { EventEmitter } from 'events'
import chalk from 'chalk'
import { LoggerTypes, LoggerFormat, LoggerHeads, LoggerMessages } from '../typings'

export class Stdout extends EventEmitter {
  private heads: LoggerHeads
  private messages: LoggerMessages
  private hasDatetime: boolean

  constructor () {
    super()

    this.heads = []
    this.messages = []
  }

  public head (content: string, format?: LoggerFormat): this {
    this.heads.push({ content, format })
    return this
  }

  public dateime (format: LoggerFormat = chalk.gray.bind(chalk)): this {
    if (this.hasDatetime === true) {
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
    this.type(LoggerTypes.LOG, chalk.whiteBright.bind(chalk))
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.LOG)
  }

  public ok (message?: string | Error, format?: LoggerFormat): void {
    this.type(LoggerTypes.OK, chalk.greenBright.bind(chalk))
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.OK)
  }

  public info (message?: string | Error, format?: LoggerFormat): void {
    this.type(LoggerTypes.INFO, chalk.cyanBright.bind(chalk))
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.INFO)
  }

  public warn (message?: string | Error, format?: LoggerFormat): void {
    this.type(LoggerTypes.WARN, chalk.yellowBright.bind(chalk))
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.WARN)
  }

  public error (message?: string | Error, format?: LoggerFormat): void {
    this.type(LoggerTypes.ERROR, chalk.redBright.bind(chalk))
    arguments.length > 0 && this.write(message, format)
    this.send(LoggerTypes.ERROR)
  }

  public write (content: string | Error, format?: LoggerFormat): this {
    this.messages.push({ content, format })
    return this
  }

  public send (type: string = LoggerTypes.LOG): this {
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
}

export default new Stdout()
