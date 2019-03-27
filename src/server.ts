import { ServerOptions } from './libs/OptionManager'
import Deployer from './libs/Deployer'

let options = new ServerOptions({
  devToolCli: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
  // devToolServer: 'http://127.0.0.1:49881',
  deployServerPort: 3000
})

const deployer = new Deployer(options)
deployer.start()