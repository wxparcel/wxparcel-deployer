import { EventEmitter } from 'events'
import chalk from 'chalk'

export class StdoutService extends EventEmitter {
  public loading (value: number, total: number, message: string): void {
    this.emit('loading', { value, total, message })
  }

  public ok (message: string): void {
    return this.log(`${chalk.green.bold('[OK]')} ${message}`)
  }

  public info (message: string): void {
    return this.log(`${chalk.blue.bold('[INFO]')} ${message}`)
  }

  public warn (message: string | Error): void {
    if (message instanceof Error) {
      this.emit('warn', message)
      return
    }

    this.log(`${chalk.yellow.bold('[WARN]')} ${message}`)
  }

  public error (message: string | Error): void {
    if (message instanceof Error) {
      this.emit('error', message)
      return
    }

    this.log(`${chalk.red.bold('[ERROR]')} ${message}`)
  }

  public log (message: string): void {
    this.emit('log', message)
  }

  public clear (isSoft: boolean = true): void {
    this.emit('clear', isSoft)
  }
}

export default new StdoutService()
