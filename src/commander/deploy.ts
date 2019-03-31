import fs = require('fs-extra')
import path = require('path')
import program = require('commander')
import chalk from 'chalk'
import Logger from '../libs/Logger'
import { ClientOptions } from '../libs/OptionManager'
import HttpClient from '../clients/Http'
import stdoutServ from '../services/stdout'
import { ClientCLIOptions } from '../typings'

export const deploy = async (options: ClientCLIOptions = {}) => {
  let { config: configFile, version, message } = options
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
    deployServer: options.server
  })

  const logger = new Logger({ type: globalOptions.logType })
  logger.listen(stdoutServ)

  if (!options.hasOwnProperty('version')) {
    const pkgFile = path.join(globalOptions.rootPath, 'package.json')

    if (fs.existsSync(pkgFile)) {
      const pkg = fs.readJSONSync(pkgFile)
      version = pkg.version
    }
  }

  if (!version) {
    throw new Error('Version is not defined, please use option `--version`')
  }

  const folder = options.folder || globalOptions.rootPath
  const client = new HttpClient(globalOptions)

  stdoutServ.clear()
  stdoutServ.info(`Start uploading ${chalk.bold(folder)}`)
  await client.uploadProject(folder, version, message)

  stdoutServ.ok(`Project ${chalk.bold(folder)} upload completed`)
}

program
.command('deploy')
.description('deploy wx miniprogram')
.option('-c, --config <config>', 'settting config file')
.option('-v, --version <version>', 'setting deploy version')
.option('-d, --message <message>', 'setting deploy message')
.option('--folder <folder>', 'setting wx mini program project folder path')
.option('--server <server>', 'setting deploy server url, default 0.0.0.0:3000')
.action(deploy)
