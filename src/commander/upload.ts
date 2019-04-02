import fs = require('fs-extra')
import path = require('path')
import program = require('commander')
import chalk from 'chalk'
import Logger from '../libs/Logger'
import { ClientOptions } from '../libs/OptionManager'
import HttpClient from '../libs/client/Http'
import SocketClient from '../libs/client/Socket'
import stdoutServ from '../services/stdout'
import { ClientCLIOptions } from '../typings'

export const upload = async (options: ClientCLIOptions = {}) => {
  let { config: configFile, version, message } = options
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

  let logger = new Logger({ type: globalOptions.logType })
  logger.listen(stdoutServ)

  if (!options.hasOwnProperty('version')) {
    let pkgFile = path.join(globalOptions.rootPath, 'package.json')

    if (fs.existsSync(pkgFile)) {
      let pkg = fs.readJSONSync(pkgFile)
      version = pkg.version
    }
  }

  if (!version) {
    throw new Error('Version is not defined, please use option `--version`')
  }

  let folder = options.folder || globalOptions.rootPath
  if (options.hasOwnProperty('socket')) {
    let client = new SocketClient(globalOptions)
    await client.connect().catch((error) => {
      stdoutServ.error(error)
      process.exit(3)
    })

    client.on('destroy', () => stdoutServ.error('Connecting closed'))
    client.destroy()

    stdoutServ.warn('Upload function has not been completed yet in socket mode.')
    stdoutServ.warn(`Please use ${chalk.yellow.bold('wxparcel-deployer deploy')} to upload project.`)

  } else {
    let client = new HttpClient(globalOptions)

    stdoutServ.clear()
    stdoutServ.info(`Start uploading ${chalk.bold(folder)}`)
    await client.uploadProject(folder, version, message).catch((error) => {
      console.log(error)
      stdoutServ.error(error)
      process.exit(3)
    })

    stdoutServ.ok(`Project ${chalk.bold(folder)} upload completed`)
  }
}

program
.command('upload')
.description('upload project to wechat cloud.')
.option('-c, --config <config>', 'settting config file')
.option('-v, --version <version>', 'setting upload version')
.option('-d, --message <message>', 'setting upload message')
.option('--folder <folder>', 'setting wx mini program project folder path')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.option('--socket', 'setting upload server url, default 0.0.0.0:3000')
.action(upload)
