import fs = require('fs-extra')
import path = require('path')
import program = require('commander')
import chalk from 'chalk'
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
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

  const folder = options.folder || globalOptions.rootPath
  const client = new HttpClient(globalOptions)

  stdout.clear()
  stdout.log(`start upload ${chalk.bold(folder)}`)

  const uploadPath = options.hasOwnProperty('distributor') ? '/collector' : '/upload'
  await client.upload(folder, version, message, uploadPath).catch((error) => {
    stdout.error(error)
    process.exit(3)
  })

  stdout.ok(`project ${chalk.bold(folder)} deploy completed`)
}

program
.command('upload')
.description('upload project to wechat cloud.')
.option('--folder <folder>', 'setting wx mini program project folder path')
.option('-v, --version <version>', 'setting upload version')
.option('-d, --message <message>', 'setting upload message')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.action(wrapClientAction(upload))
