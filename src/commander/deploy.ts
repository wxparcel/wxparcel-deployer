import * as fs from 'fs-extra'
import * as program from 'commander'
import { ClientOptions } from '../libs/OptionManager'
import Client from '../libs/Client'
import Logger from '../libs/Logger'
import stdoutServ from '../services/stdout'
import { ClientCLIOptions } from '../types'

export const deploy = async (options: ClientCLIOptions = {}) => {
  let { config: configFile } = options
  let defaultOptions: any = {}

  if (configFile) {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
    }

    defaultOptions = require(configFile)
    defaultOptions = defaultOptions.default || defaultOptions
  }

  const globalOptions = new ClientOptions({
    ...defaultOptions,
    deployServer: options.deployServ
  })

  const logger = new Logger(globalOptions)
  logger.connect(stdoutServ)

  try {
    const folder = options.folder || globalOptions.rootPath
    const client = new Client(globalOptions)
    await client.uploadProject(folder)

  } catch (error) {
    stdoutServ.error(error)
  }
}

program
.command('deploy')
.description('deploy wx miniprogram')
.option('-c', '--config <config>', 'settting config file')
.option('--folder', 'setting wx mini program project folder path')
.option('--server', 'setting deploy server url, default 0.0.0.0:3000')
.action(deploy)
