import { EventEmitter } from 'events'
import chalk from 'chalk'

export class StdoutService extends EventEmitter {
  public loading (value: number, total: number, message: string): void {
    this.emit('loading', { value, total, message })
  }

  public ok (message: string): void {
    return this.trace(`${chalk.green.bold('[OK]')} ${message}`)
  }

  public info (message: string): void {
    return this.trace(`${chalk.blue.bold('[INFO]')} ${message}`)
  }

  public trace (message: string): void {
    this.emit('trace', message)
  }

  public warn (message: string | Error): void {
    this.emit('warn', message)
  }

  public error (message: string | Error): void {
    this.emit('error', message)
  }

  public clear (isSoft: boolean = true): void {
    this.emit('clear', isSoft)
  }
}

export default new StdoutService()
