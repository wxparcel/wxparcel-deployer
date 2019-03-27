import chalk from 'chalk'
import PrettyError = require('pretty-error')
import { LogTypes, LoggerOptions } from '../types'

export default class Logger {
  private type: keyof typeof LogTypes | Array<keyof typeof LogTypes>
  private silence: boolean

  get useConsole () {
    if (this.type === 'console') {
      return true
    }

    if (Array.isArray(this.type) && -1 !== this.type.indexOf('console')) {
      return true
    }

    return false
  }

  constructor (options?: LoggerOptions) {
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
    options && this.configure(options)
  }

  public configure (options: LoggerOptions): void {
    this.type = options.type || 'console'
  }

  public error (reason): void {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
        let pe = new PrettyError()
        reason.message = chalk.red(reason.message)

        let message = pe.render(reason)
        this.trace(message)
      } else {
        reason = chalk.red(reason)
        this.trace(reason)
      }
    }
  }

  public warn (reason: string | Error): void {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error) {
        let pe = new PrettyError()
        reason.message = chalk.yellow(reason.message)

        let message = pe.render(reason)
        this.trace(message)

      } else {
        reason = chalk.yellow(reason)
        this.trace(reason)
      }
    }
  }

  public trace (message): void {
    if (this.useConsole === true && this.silence !== true) {
      this.log(message)
    }
  }

  public log (...message): void {
    console.log(...message)
  }

  public clear (isSoft = true): void {
    process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }

  public listen (stdoutServ): void {
    stdoutServ.on('trace', (message: string) => this.trace(message))
    stdoutServ.on('error', (message: string) => this.error(message))
    stdoutServ.on('warn', (message: string) => this.warn(message))
    stdoutServ.on('clear', (isSoft: boolean) => this.clear(isSoft))
  }
}
