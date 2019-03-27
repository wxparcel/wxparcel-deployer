import * as fs from 'fs-extra'
import { promisify } from 'util'
import { spawn, SpawnOptions } from 'child_process'
import { Stdout } from '../types'

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

export const spawnPromisify = (cli: string, params?: Array<string>, options?: SpawnOptions, stdout?: Stdout) => {
  return new Promise((resolve) => {
    const cp = spawn(cli, params, options)

    if (typeof stdout === 'function') {
      cp.stdout.on('data', (data) => stdout(data, 'out'))
      cp.stderr.on('data', (data) => stdout(data, 'err'))
    }

    cp.on('exit', (code) => resolve(code))
  })
}
