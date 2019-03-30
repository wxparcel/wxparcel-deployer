import chalk from 'chalk'
import PrettyError = require('pretty-error')
import { Bar } from 'cli-progress'
import { LogTypes, LoggerOptions } from '../typings'

export default class Logger {
  private type: keyof typeof LogTypes | Array<keyof typeof LogTypes>
  private silence: boolean
  private loadingBar: any

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

  public error (message: string | Error): void {
    if (message instanceof Error) {
      return this.trace(message, chalk.red.bind(chalk))
    }

    return this.log(chalk.red(message))
  }

  public warn (message: string | Error): void {
    if (message instanceof Error) {
      return this.trace(message, chalk.yellow.bind(chalk))
    }

    return this.log(chalk.yellow(message))
  }

  public trace (message: string | Error, color?: (message: string) => string): void {
    if (!(message instanceof Error)) {
      message = new Error(message)
    }

    if (typeof color === 'function') {
      message.message = color(message.message)
    }

    let pe = new PrettyError()
    message = pe.render(message)
    return this.log(message)
  }

  public log (...message: string[]): void {
    if (this.useConsole === true && this.silence !== true) {
      console.log(...message)
    }
  }

  public clear (isSoft = true): void {
    process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }

  public listen (stdoutServ): void {
    stdoutServ.on('log', (message: string) => this.log(message))
    stdoutServ.on('trace', (message: string) => this.trace(message))
    stdoutServ.on('warn', (message: string) => this.warn(message))
    stdoutServ.on('error', (message: string) => this.error(message))
    stdoutServ.on('clear', () => this.clear())
    stdoutServ.on('loading', ({ value, total, message }) => this.loading(value, total, message))
  }
}
