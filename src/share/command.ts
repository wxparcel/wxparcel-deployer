import fs = require('fs-extra')
import ClientOptions from '../client/OptionManager'
import Logger from '../libs/Logger'
import Stdout, { Stdout as StdoutServ } from '../services/stdout'
import { ClientCLIOptions } from '../typings'

export const wrapClientAction = (action: (options: ClientCLIOptions, globalOptions: ClientOptions, stdout: StdoutServ) => Promise<any>) => (options: ClientCLIOptions) => {
  const { config: configFile } = options

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
    server: options.server
  })

  const logger = new Logger({ method: globalOptions.logMethod })
  logger.listen(Stdout)

  const stdout = Stdout.born('CLIENT')
  const finish = () => stdout.destory()

  return action(options, globalOptions, stdout).then(finish).catch(finish)
}
