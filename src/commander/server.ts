import fs = require('fs-extra')
import ip = require('ip')
import program = require('commander')
import portscanner = require('portscanner')
import chalk from 'chalk'
import Logger from '../libs/Logger'
import stdoutServ from '../services/stdout'
import OptionManager from '../server/OptionManager'
import Server from '../server'
import * as pkg from '../../package.json'

import { ServerCLIOptions } from '../typings'

export const server = async (options: ServerCLIOptions = {}) => {
  let { config: configFile, port } = options

  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000, ip.address()).catch((error) => {
      stdoutServ.error(error)
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
    devToolCli: options.devToolCli,
    port: port
  })

  if (!(globalOptions.devToolCli)) {
    throw new Error('please set devtool cli')
  }

  const method = globalOptions.logMethod
  const logger = new Logger({ method })
  logger.listen(stdoutServ)

  const server = new Server(globalOptions)
  await server.start().catch((error) => {
    stdoutServ.error(error)
    process.exit(3)

    return Promise.reject(error)
  })

  const log = (message) => console.log(message)

  stdoutServ.clear()
  log(chalk.gray.bold('WXParcel Server'))
  log(`Version: ${chalk.cyan.bold(pkg.version)}`)
  log(`Server: ${chalk.cyan.bold(`${globalOptions.ip}:${port}`)}`)
  globalOptions.devToolCli && log(`DevTool CLI: ${chalk.cyan.bold(globalOptions.devToolCli)}`)
  log(chalk.magenta('Deploy server is running, please make sure wx devtool has been logined.'))

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
.option('--dev-tool-cli <devToolCli>', 'setting devtool cli file path')
.action(server)
