import fs = require('fs-extra')
import path = require('path')
import { spawn, SpawnOptions } from 'child_process'
import Zip = require('jszip')
import { promisify } from 'util'
import { Stdout, ChildProcessMap, ClientZipSource } from '../typings'

// size
// -------------

export const unitSize = (size: number, amount: number = 1024, units: Array<string> = ['K', 'M', 'G']): string => {
  const loop = (size: number, units: Array<string>): string => {
    if (size < amount) {
      return size.toFixed(2)
    }

    return loop(size / amount, units.splice(1))
  }

  return loop(size, units) + units[0]
}

// fs
// -------------

export const writeFilePromisify = promisify(fs.writeFile.bind(fs))

export const unzip = async (file: string, folder: string): Promise<Array<Promise<void>>> => {
  const zip = new Zip()
  const contents = await zip.loadAsync(fs.readFileSync(file))

  return Object.keys(contents.files).map(async (file) => {
    if (!zip.file(file)) {
      return
    }

    const content = await zip.file(file).async('nodebuffer')

    file = path.join(folder, file)
    const parent = path.dirname(file)

    fs.ensureDirSync(parent)
    return writeFilePromisify(file, content)
  })
}

export const ensureDirs = async (...dirs: Array<string>) => {
  let ensureDirPromisify = promisify(fs.ensureDir.bind(fs))
  let promises = dirs.map((dir) => ensureDirPromisify(dir))
  return Promise.all(promises)
}

export const removeFiles = (...files: Array<string>) => {
  let removePromisify = promisify(fs.remove.bind(fs))
  let promises = files.map((dir) => removePromisify(dir))
  return Promise.all(promises)
}

export const findFiles = (file: string, relativeTo: string): Array<ClientZipSource> => {
  const fileMap: Array<ClientZipSource> = []

  const findDeep = (file: string): void => {
    const stat = fs.statSync(file)

    if (stat.isFile()) {
      const destination = file.replace(relativeTo, '')
      fileMap.push({ file, destination })
    }

    if (stat.isDirectory()) {
      const folder = path.isAbsolute(file) ? file : path.join(file, relativeTo)
      const files = fs.readdirSync(file)

      files.forEach((filename) => {
        let file = path.join(folder, filename)
        findDeep(file)
      })
    }
  }

  findDeep(file)
  return fileMap
}

export const zip = (file: string, relativeTo: string, zip: Zip = new Zip()): Zip => {
  let fileMap = this.findFiles(file, relativeTo)

  fileMap.forEach(({ file, destination }) => {
    let name = path.basename(destination)
    let folder = path.dirname(destination)
    let stream = fs.createReadStream(file)
    zip.folder(folder).file(name, stream)
  })

  return zip
}

// child_process
// -------------

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
        reject(new Error('Process has been killed'))
        cp.kill('SIGINT')
      }

      processes.push({ token, kill })
    }

    cp.on('exit', (code) => resolve(code))
    cp.on('SIGINT', () => reject(new Error('Process has been killed')))

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
