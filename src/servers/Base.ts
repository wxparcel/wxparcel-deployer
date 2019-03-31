import chalk from 'chalk'
import stdoutServ from '../services/stdout'

export default class Server {
  private queue: Array<Promise<any>>

  get idle () {
    return this.queue.length === 0
  }

  constructor () {
    this.queue = []
  }

  public async execute (command: () => Promise<void>): Promise<void> {
    this.queue.length > 0 && await Promise.all(this.queue)

    const promise = command()
    this.pushQueue(promise)

    await promise

    let index = this.queue.indexOf(promise)
    this.queue.splice(index, 1)
  }

  public pushQueue (...promises: Array<Promise<void>>) {
    this.queue.push(...promises)
  }

  public logger (uid: string): (message: string) => void {
    return (message) => {
      const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      stdoutServ.info(`[${chalk.green(uid)}] ${message} ${chalk.gray(datetime)}`)
    }
  }

  public destory (): void {
    this.queue.splice(0)
    this.queue = undefined
  }
}
