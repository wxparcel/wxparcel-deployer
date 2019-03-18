import * as fs from 'fs-extra'
import { promisify } from 'util'
import { spawn, SpawnOptions } from 'child_process'
import { StdoutHandle } from '../types'

export const ensureDirPromisify = promisify(fs.ensureDir.bind(fs))
export const ensureFilePromisify = promisify(fs.ensureFile.bind(fs))
export const removeFilePromisify = promisify(fs.remove.bind(fs))

export const spawnPromisify = (cli: string, params?: Array<string>, options?: SpawnOptions, stdout?: StdoutHandle) => {
  return new Promise((resolve, reject) => {
    const cp = spawn(cli, params, options)

    if (typeof stdout === 'function') {
      cp.stdout.on('data', (data) => stdout(data, 'out'))
      cp.stderr.on('data', (data) => stdout(data, 'err'))
    }

    cp.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Login fail: ${code}`)))
  })
}
