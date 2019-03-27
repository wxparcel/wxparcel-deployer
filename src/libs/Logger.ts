import chalk from 'chalk'
import PrettyError = require('pretty-error')
import { OptionManager } from './OptionManager'
import { LogTypes } from '../types'

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

  constructor (options: OptionManager) {
    this.type = options.logType || 'console'
    this.silence = process.argv.findIndex((argv) => argv === '--quiet' || argv === '--silence') !== -1
  }

  public error (reason) {
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

  public warn (reason) {
    if (this.useConsole === true && this.silence !== true) {
      if (reason instanceof Error || reason instanceof TypeError) {
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

  public trace (message) {
    if (this.useConsole === true && this.silence !== true) {
      this.log(message)
    }
  }

  public log (...message) {
    console.log(...message)
  }

  public clear (isSoft = true) {
    process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
  }

  public connect (stdoutServ) {
    stdoutServ.on('trace', (message: string) => this.trace(message))
    stdoutServ.on('error', (message: string) => this.error(message))
    stdoutServ.on('warn', (message: string) => this.warn(message))
    stdoutServ.on('clear', (isSoft: boolean) => this.clear(isSoft))
  }
}
