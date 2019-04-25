export class Queue {
  private queue: Array<Promise<any>>

  get size () {
    return this.queue.length
  }

  get promise () {
    return [].concat(this.queue)
  }

  constructor () {
    this.queue = []
  }

  public push (...promises: Array<Promise<void>>) {
    let filterAndBindings = (promise) => {
      if (promise instanceof Promise) {
        let removePromise = this.remove.bind(null, promise)
        promise.then(removePromise).catch(removePromise)
        return true
      }

      return false
    }

    promises = promises.filter(filterAndBindings)
    this.queue.push(...promises)
  }

  public remove (promise: Promise<void>) {
    let index = this.queue.indexOf(promise)
    index !== -1 && this.queue.splice(index, 1)
  }
}

export default new Queue()
