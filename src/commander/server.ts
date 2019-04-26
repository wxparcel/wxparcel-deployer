import fs = require('fs-extra')
import ip = require('ip')
import program = require('commander')
import portscanner = require('portscanner')
import chalk from 'chalk'
import Logger from '../libs/Logger'
import StdoutServ from '../services/stdout'
import OptionManager from '../server/OptionManager'
import Server from '../server'
import * as pkg from '../../package.json'

import { ServerCLIOptions } from '../typings'

export const server = async (options: ServerCLIOptions = {}) => {
  let { config: configFile, port } = options

  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000, ip.address()).catch((error) => {
      StdoutServ.error(error)
      process.exit(3)

      return Promise.reject(error)
    })
  }

  let defaultOptions: any = {}
  if (configFile) {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
    }

    defaultOptions = require(configFile)
    defaultOptions = defaultOptions.default || defaultOptions
  }

  const globalOptions = new OptionManager({
    ...defaultOptions,
    devToolServer: options.devtool || 'http://127.0.0.1:28337',
    port: port
  })

  if (!globalOptions.devToolServer) {
    throw new Error('please set devtool server')
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

  const log = (message) => console.log(message)

  StdoutServ.clear()
  log(chalk.gray.bold('WXParcel Server'))
  log(`Version: ${chalk.cyan.bold(pkg.version)}`)
  log(`Server: ${chalk.cyan.bold(`${globalOptions.ip}:${port}`)}`)
  log(`DevTool: ${chalk.cyan.bold(globalOptions.devToolServer)}`)
  log(chalk.magenta('deploy server is running, please make sure wx devtool has been logined.'))

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
.action(server)
