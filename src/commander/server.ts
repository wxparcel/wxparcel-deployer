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
  let port = options.port
  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000)
  }

  const globalOptions = new ServerOptions({
    devToolCli: options.devToolCli,
    devToolServer: options.devToolServ,
    deployServerPort: port
  })

  const logger = new Logger(globalOptions)
  logger.connect(stdoutServ)

  const deployer = new Deployer(globalOptions)
  await deployer.start()
  
  stdoutServ.trace(`Deploy server is running.`)
  stdoutServ.trace(`Version: ${chalk.cyan.bold(pkg.version)}`)
  stdoutServ.trace(`Server: ${chalk.cyan.bold(`${globalOptions.ip}:${port}`)}`)
}

program
.command('server')
.description('start deploy server')
.option('-p, --port <port>', 'setting server port, default use idle port')
.option('--dev-tool-cli <devToolCli>', 'setting devtool cli file path')
.option('--dev-tool-serv <devToolServ>', 'setting devtool server url')
.action(server)

// '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
// '/Users/zhongjiahao/Develop/yijian/qinxuan-wxapp'
