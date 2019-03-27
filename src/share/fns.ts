import * as fs from 'fs-extra'
import { promisify } from 'util'

export const writeFilePromisify = promisify(fs.writeFile.bind(fs))

export const unitSize = (size: number, amount: number = 1024, units: Array<string> = ['K', 'M', 'G']): string => {
  const loop = (size: number, units: Array<string>): string => {
    if (size < amount) {
      return size.toFixed(2)
    }

    return loop(size / amount, units.splice(1))
  }

  return loop(size, units) + units[0]
}
