import fs = require('fs-extra')
import path = require('path')
import chalk from 'chalk'
import PrettyError = require('pretty-error')
import { Bar } from 'cli-progress'

import { WriteStream } from 'fs'
import { LoggerMethods, LoggerTypes, LoggerOptions, LoggerFormat, LoggerHeads, LoggerMessages } from '../typings'

export default class Logger {
  static TYPES: Array<LoggerTypes> = [
    LoggerTypes.LOG,
    LoggerTypes.OK,
    LoggerTypes.INFO,
    LoggerTypes.WARN,
    LoggerTypes.ERROR,
    LoggerTypes.CLEAR
  ]

  private method: string | Array<string>
  private silence: boolean
  private loadingBar: any
  private stream: WriteStream

  get useConsole () {
    return this.canUse(LoggerMethods.CONSOLE)
  }

  get useFile () {
    return this.canUse(LoggerMethods.FILE)
  }

  constructor (options?: LoggerOptions) {
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
    this.configure(options)

    if (this.useFile === true && options.hasOwnProperty('logFile')) {
      let file = path.isAbsolute(options.logFile) ? options.logFile : path.join(process.cwd(), options.logFile)

      fs.ensureFileSync(file)
      this.stream = fs.createWriteStream(file)

      let handleProcessSigint = process.exit.bind(process)
      let handleProcessExit = () => {
        this.stream && this.stream.close()

        process.removeListener('exit', handleProcessExit)
        process.removeListener('SIGINT', handleProcessSigint)

        handleProcessExit = undefined
        handleProcessSigint = undefined
      }

      process.on('exit', handleProcessExit)
      process.on('SIGINT', handleProcessSigint)
    }
  }

  public configure (options: LoggerOptions = {}): void {
    if (options.hasOwnProperty('method')) {
      this.method = options.method
    }
  }

  public listen (stdoutServ): void {
    Logger.TYPES.forEach((type: string) => {
      stdoutServ.on(type, (datas) => {
        type = type.toUpperCase()

        let heads: Array<{ content: string, format?: (content: string) => string }> = datas.heads || []
        let messages: Array<{ content: string | Error, format?: (content: string) => string }> = datas.messages || []

        switch (type) {
          case LoggerTypes.LOG:
            this.log(messages, heads)
            break
          case LoggerTypes.INFO:
            this.info(messages, heads)
            break
          case LoggerTypes.OK:
            this.ok(messages, heads)
            break
          case LoggerTypes.WARN:
            this.warn(messages, heads)
            break
          case LoggerTypes.ERROR:
            this.error(messages, heads)
            break
          case LoggerTypes.CLEAR:
            this.clear()
            break
        }
      })
    })

    stdoutServ.on('loading', ({ value, total, message }) => {
      this.loading(value, total, message)
    })
  }

  public ok (message: LoggerMessages, heads?: LoggerHeads): void {
    return this.log(message, heads, chalk.green.bold)
  }

  public info (message: LoggerMessages, heads?: LoggerHeads): void {
    return this.log(message, heads, chalk.cyan.bold)
  }

  public warn (message: LoggerMessages, heads?: LoggerHeads): void {
    return this.log(message, heads, chalk.yellow.bold)
  }

  public error (message: LoggerMessages, heads?: LoggerHeads): void {
    return this.log(message, heads, chalk.red.bold)
  }

  public log (message: string | Error | LoggerMessages, head?: string | LoggerHeads, format?: LoggerFormat): void {
    if (this.useConsole === true && this.silence !== true) {
      if (Array.isArray(message)) {
        message = this.stringifyMessages(message)

      } else if (message instanceof Error) {
        message = this.stringifyError(message)

      } else if (typeof message === 'string') {
        message = typeof format === 'function' ? format(message) : message
      }

      if (Array.isArray(head)) {
        head = this.stringifyHeads(head)

      } else if (typeof head === 'string') {
        head = `[${head}]`
      }

      console.log(`${head ? head + ' ' : head}${message}`)
    }

    if (this.useFile === true) {
      if (Array.isArray(head)) {
        head = head.map((content) => `[${content}]`).join(' ')

      } else if (typeof head === 'string') {
        head = `[${head}]`
      }

      this.stream.write(`${head ? head + ' ' : head}${message}\n`)
    }
  }

  public clear (isSoft = true): void {
    process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }

  public loading (value: number, total: number, message: string = ''): any {
    if (value >= total) {
      if (this.loadingBar) {
        this.loadingBar.stop()
        this.loadingBar = null
      }

    } else {
      if (!this.loadingBar) {
        let options = {
          format: `${message} [{bar}] {percentage}% | {value}/{total}`
        }

        this.loadingBar = new Bar(options)
        this.loadingBar.start(total, 0)
      }

      this.loadingBar.update(value)
    }
  }

  public stringifyHeads (heads: LoggerHeads, format?: LoggerFormat): string {
    let content = heads.map((item) => {
      if (typeof item === 'string') {
        return `[${typeof format === 'function' ? format(item) : item}]`
      }

      let { content, format: color } = item
      return `[${typeof color === 'function' ? color(content) : content}]`
    })

    return content.join('')
  }

  public stringifyMessages (messages: LoggerMessages, format?: LoggerFormat) {
    let content = messages.map((item) => {
      if (typeof item === 'string') {
        return `[${typeof format === 'function' ? format(item) : item}]`
      }

      let { content, format: color } = item
      content = (content instanceof Error ? `\n${this.stringifyError(content)}` : content)
      content = typeof color === 'function' ? color(content) : content
      return content
    })

    return content.join(' ')
  }

  public stringifyError (error: Error): string {
    let pe = new PrettyError()
    return pe.render(error)
  }

  public canUse (loggerMethod: LoggerMethods) {
    if (typeof this.method === 'string') {
      let method = this.method.toUpperCase()
      return method === loggerMethod
    }

    if (Array.isArray(this.method)) {
      return -1 !== this.method.findIndex((method) => method.toUpperCase() === loggerMethod)
    }

    return false
  }
}
