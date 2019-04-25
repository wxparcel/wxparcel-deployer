import fs = require('fs-extra')
import path = require('path')
import program = require('commander')
// import chalk from 'chalk'
import Logger from '../libs/Logger'
import { ClientOptions } from '../libs/OptionManager'
import HttpClient from '../client/Http'
// import stdoutServ from '../services/stdout'
import { ClientCLIOptions } from '../typings'

const action = (action) => (options) => {
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
  // logger.listen(stdoutServ)

  return action(options, globalOptions)
}

const upload = async (options: ClientCLIOptions = {}, globalOptions: ClientOptions) => {
  let { version, message } = options
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

  const folder = options.folder || globalOptions.rootPath
  const client = new HttpClient(globalOptions)

  // stdoutServ.clear()
  // stdoutServ.info(`Start uploading ${chalk.bold(folder)}`)

  const uploadPath = options.hasOwnProperty('distributor') ? '/collector' : '/upload'
  await client.upload(folder, version, message, uploadPath).catch((_) => {
    // stdoutServ.error(error)
    process.exit(3)
  })

  // stdoutServ.ok(`Project ${chalk.bold(folder)} upload completed`)
}

program
.command('upload')
.description('upload project to wechat cloud.')
.option('--folder <folder>', 'setting wx mini program project folder path')
.option('-v, --version <version>', 'setting upload version')
.option('-d, --message <message>', 'setting upload message')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.option('--socket', 'setting socket mode')
.option('--distributor', 'setting distributor mode')
.action(action(upload))
