import fs = require('fs-extra')
import { promisify } from 'util'
import { spawn, SpawnOptions } from 'child_process'
import { Stdout, ChildProcessMap } from '../typings'

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

const processes: Array<ChildProcessMap> = []

export const spawnPromisify = (cli: string, params?: Array<string>, options?: SpawnOptions, stdout?: Stdout, killToken?: Symbol): Promise<any> => {
  return new Promise((resolve, reject) => {
    let cp = spawn(cli, params || [], options || {})

    if (typeof stdout === 'function') {
      cp.stdout.on('data', (data) => stdout(data, 'out'))
      cp.stderr.on('data', (data) => stdout(data, 'err'))
    }

    if (killToken) {
      let token = killToken
      let kill = () => {
        reject('Process has been killed')
        cp.kill('SIGINT')
      }

      processes.push({ token, kill })
    }

    cp.on('exit', (code) => resolve(code))
    cp.on('SIGINT', () => reject('Process has been killed'))

    let handleProcessSigint = process.exit.bind(process)
    let handleProcessExit = () => {
      cp && cp.kill('SIGINT')

      process.removeListener('exit', handleProcessExit)
      process.removeListener('SIGINT', handleProcessSigint)

      handleProcessExit = undefined
      handleProcessSigint = undefined
      cp = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)
  })
}

export const killToken = () => {
  return Symbol('Kill Token')
}

export const killProcess = (token: Symbol) => {
  let index = processes.findIndex((item) => item.token === token)
  if (-1 === index) {
    return
  }

  let [cp] = processes.splice(index, 1)
  cp.kill()
}
