import os = require('os')
import fs = require('fs-extra')
import path = require('path')
import ip = require('ip')
import program = require('commander')
import portscanner = require('portscanner')
import chalk from 'chalk'
import Logger from '../libs/Logger'
import StdoutServ from '../services/stdout'
import OptionManager from '../server/OptionManager'
import Server from '../server'
import { spawnPromisify } from '../share/fns'
import * as pkg from '../../package.json'
import { ServerCLIOptions } from '../typings'

const startDevtoolAndGetPort = (cli?: string, ide?: string) => {
  const isOSX = 'darwin' === os.platform()
  const isWin = 'win32' === os.platform()

  if (!cli) {
    if (isOSX) {
      cli = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
    }
  }

  return spawnPromisify(cli).then(() => {
    if (ide) {
      return fs.readFile(ide)
    }

    if (isOSX) {
      let relative = '/Library/Application Support/微信web开发者工具/Default/.ide'
      ide = path.join(os.homedir(), relative)
      return fs.readFile(ide)
    }

    if (isWin) {
      let relative = '/AppData/Local/微信web开发者工具/User Data/Default/.ide'
      ide = path.join(os.homedir(), relative)
      return fs.readFile(ide)
    }

    return Promise.reject(new Error('ide file not found'))
  })
}

export const server = async (options: ServerCLIOptions = {}) => {
  let { config: configFile, port } = options

  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000, ip.address())
  }

  let defaultOptions: any = {}
  if (configFile) {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
    }

    defaultOptions = require(configFile)
    defaultOptions = defaultOptions.default || defaultOptions
  }

  if (!options.devtool) {
    const { devtoolCli, devtoolIde } = options
    const port = await startDevtoolAndGetPort(devtoolCli, devtoolIde)
    options.devtool = `http://127.0.0.1:${port}`
  }

  const globalOptions = new OptionManager({
    ...defaultOptions,
    devToolServer: options.devtool,
    port: port
  })

  if (!globalOptions.devToolServer) {
    throw new Error('devtool server is empty or invalid')
  }

  const method = globalOptions.logMethod
  const logger = new Logger({ method })
  logger.listen(StdoutServ)

  const server = new Server(globalOptions)
  await server.start().catch((error) => {
    StdoutServ.error(error)
    process.exit(3)

    return Promise.reject(error)
  })

  StdoutServ.clear()
  console.log(chalk.gray.bold('WXParcel Server'))
  console.log(`Version: ${chalk.cyan.bold(pkg.version)}`)
  console.log(`Server: ${chalk.cyan.bold(`${globalOptions.ip}:${port}`)}`)
  console.log(`DevTool: ${chalk.cyan.bold(globalOptions.devToolServer)}`)
  console.log(chalk.magenta('deploy server is running, please make sure wx devtool has been logined.'))

  let handleProcessSigint = process.exit.bind(process)
  let handleProcessExit = () => {
    server && server.destroy()

    process.removeListener('exit', handleProcessExit)
    process.removeListener('SIGINT', handleProcessSigint)

    handleProcessExit = undefined
    handleProcessSigint = undefined
  }

  process.on('exit', handleProcessExit)
  process.on('SIGINT', handleProcessSigint)
}

program
.command('server')
.description('start deploy server')
.option('-c, --config <config>', 'settting config file')
.option('-p, --port <port>', 'setting server port, default use idle port')
.option('-d, --devtool <devtool>', 'setting devtool server')
.option('--devtool-cli <devtool-cli>', 'setting devtool cli')
.option('--devtool-ide <devtool-ide>', 'setting devtool ide')
.action(server)
