import * as fs from 'fs-extra'
import * as program from 'commander'
import * as portscanner from 'portscanner'
import chalk from 'chalk'
import { ServerOptions } from '../libs/OptionManager'
import Deployer from '../libs/Deployer'
import Logger from '../libs/Logger'
import stdoutServ from '../services/stdout'
import * as pkg from '../../package.json'
import { ServerCLIOptions } from '../types'

export const server = async (options: ServerCLIOptions = {}) => {
  let { config: configFile, port } = options
  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000)
  }

  let defaultOptions: any = {}
  if (configFile) {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
    }

    defaultOptions = require(configFile)
    defaultOptions = defaultOptions.default || defaultOptions
  }

  const globalOptions = new ServerOptions({
    ...defaultOptions,
    devToolCli: options.devToolCli,
    devToolServer: options.devToolServ,
    deployServerPort: port
  })

  if (!(globalOptions.devToolCli || globalOptions.devToolServer)) {
    throw new Error('Please set devtool cli or devtool server url')
  }

  const logger = new Logger({ type: globalOptions.logType })
  logger.listen(stdoutServ)

  const deployer = new Deployer(globalOptions)
  await deployer.start()

  stdoutServ.clear()
  stdoutServ.trace(chalk.gray.bold('WXParcel Deployer Server'))
  stdoutServ.trace(`Version: ${chalk.cyan.bold(pkg.version)}`)
  stdoutServ.trace(`Server: ${chalk.cyan.bold(`${globalOptions.ip}:${port}`)}`)
  globalOptions.devToolCli && stdoutServ.trace(`DevTool CLI: ${chalk.cyan.bold(globalOptions.devToolCli)}`)
  globalOptions.devToolServer && stdoutServ.trace(`DevTool Server: ${chalk.cyan.bold(globalOptions.devToolServer)}`)
  stdoutServ.trace(chalk.blue('Deploy server is running, please make sure wx devtool has been logined.'))
}

program
.command('server')
.description('start deploy server')
.option('-c', '--config <config>', 'settting config file')
.option('-p, --port <port>', 'setting server port, default use idle port')
.option('--dev-tool-cli <devToolCli>', 'setting devtool cli file path')
.option('--dev-tool-serv <devToolServ>', 'setting devtool server url')
.action(server)
