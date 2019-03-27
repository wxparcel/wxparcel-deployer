import OptionManager from './libs/OptionManager'
import * as portscanner from 'portscanner'
import Deployer from './libs/Deployer'

portscanner.findAPortNotInUse(3000, 8000).then(async (idlePort) => {
  let options = new OptionManager({
    devToolServer: 'http://127.0.0.1:49881',
    deployServerPort: idlePort
  })

  const deployer = new Deployer(options)
  deployer.start()
})
