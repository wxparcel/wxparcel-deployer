import fs = require('fs-extra')
import path = require('path')
import program = require('commander')
import chalk from 'chalk'
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import WebSocketClient from '../client/WebSocket'
import { Stdout } from '../services/stdout'
import { wrapClientAction } from '../share/command'
import { ClientCLIOptions } from '../typings'

const upload = async (options: ClientCLIOptions = {}, globalOptions: ClientOptions, stdout: Stdout) => {
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

  const catchError = (error) => {
    stdout.error(error)
    process.exit(3)
  }

  const folder = options.folder || globalOptions.rootPath
  if (options.socket) {
    let client = new WebSocketClient(globalOptions)
    client.connect(globalOptions.deployServer)

    stdout.log(`start upload ${chalk.bold(folder)}`)
    const response = await client.upload(folder, version, message).catch(catchError)
    stdout.ok(response.message)

    client.destroy()

  } else {
    const client = new HttpClient(globalOptions)

    stdout.log(`start upload ${chalk.bold(folder)}`)
    const response = await client.upload(folder, version, message).catch(catchError)
    stdout.ok(response.message)
  }
}

program
.command('upload')
.description('upload project to wechat cloud.')
.option('--folder <folder>', 'setting wx mini program project folder path')
.option('-v, --version <version>', 'setting upload version')
.option('-d, --message <message>', 'setting upload message')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.option('--socket', 'setting websocket mode, default false')
.action(wrapClientAction(upload))
