import { EventEmitter } from 'events'

export class StdoutService extends EventEmitter {
  public trace (message: string) {
    this.emit('trace', message)
  }

  public warn (message: string) {
    this.emit('warn', message)
  }

  public error (message: string) {
    this.emit('error', message)
  }

  public clear (isSoft: boolean) {
    this.emit('clear', isSoft)
  }
}

export default new StdoutService()
