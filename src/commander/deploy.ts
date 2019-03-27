import * as program from 'commander'
import { ClientOptions } from '../libs/OptionManager'
import Client from '../libs/Client'
import Logger from '../libs/Logger'
import stdoutServ from '../services/stdout'
import { ClientCLIOptions } from '../types'

export const deploy = async (folder, options: ClientCLIOptions = {}) => {
  const globalOptions = new ClientOptions({
    deployServer: options.deployServ
  })

  const logger = new Logger(globalOptions)
  logger.connect(stdoutServ)

  try {
    const client = new Client(globalOptions)
    await client.uploadProject(folder)

  } catch (error) {
    stdoutServ.error(error)
  }
}

program
.command('deploy <folder>')
.description('deploy wx miniprogram')
.option('--server', 'setting deploy server url, default 127.0.0.1:3000')
.action(deploy)
