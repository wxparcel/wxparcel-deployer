import fs = require('fs-extra')
import ClientOptions from '../client/OptionManager'
import Logger from '../libs/Logger'
import StdoutServ from '../services/stdout'

export const wrapClientAction = (action) => (options) => {
  let { config: configFile } = options
  let defaultOptions: any = {}

  if (configFile) {
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
    }

    defaultOptions = require(configFile)
    defaultOptions = defaultOptions.default || defaultOptions
  }

  let globalOptions = new ClientOptions({
    ...defaultOptions,
    server: options.server
  })

  let logger = new Logger({ method: globalOptions.logMethod })
  logger.listen(StdoutServ)

  return action(options, globalOptions)
}
