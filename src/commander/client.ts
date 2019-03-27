import * as program from 'commander'
import { ClientOptions } from '../libs/OptionManager'
import Client from '../libs/Client'
import { ClientCLIOptions } from '../types'

export const deploy = async (folder: string, options: ClientCLIOptions = {}) => {
  const globalOptions = new ClientOptions({
    deployServer: options.deployServ
  })

  const client = new Client(globalOptions)
  await client.uploadProject(folder)
}

export const help = () => {

}

program
.command('deploy <folder>')
.description('deploy wx miniprogram')
.option('--server', 'setting deploy server url, default 127.0.0.1:3000')
.on('--help', help)
.action(deploy)
