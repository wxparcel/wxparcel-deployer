import * as program from 'commander'
import * as portscanner from 'portscanner'
import { ServerOptions } from '../libs/OptionManager'
import Deployer from '../libs/Deployer'
import { ServerCLIOptions } from '../types'

export const server = async (options: ServerCLIOptions = {}) => {
  let port = options.port
  if (!port) {
    port = await portscanner.findAPortNotInUse(3000, 8000)
  }

  const globalOption = new ServerOptions({
    devToolCli: options.devToolCli,
    devToolServer: options.devToolServ,
    deployServerPort: port
  })

  const deployer = new Deployer(globalOption)
  deployer.start()
}

export const help = () => {

}

program
.command('server')
.description('start deploy server')
.option('-p, --port <port>', 'setting server port, default use idle port')
.option('--dev-tool-cli <devToolCli>', 'setting devtool cli file path')
.option('--dev-tool-serv <devToolServ>', 'setting devtool server url')
.on('--help', help)
.action(server)

// '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
// '/Users/zhongjiahao/Develop/yijian/qinxuan-wxapp'
