// import fs = require('fs-extra')
// import path = require('path')
// import program = require('commander')
// import chalk from 'chalk'
// import Logger from '../libs/Logger'
// import { ClientOptions } from '../libs/OptionManager'
// import HttpClient from '../client/Http'
// import SocketClient from '../client/Socket'
// import stdoutServ from '../services/stdout'
// import { ClientCLIOptions } from '../typings'

// const action = (action) => (options) => {
//   let { config: configFile } = options
//   let defaultOptions: any = {}

//   if (configFile) {
//     if (!fs.existsSync(configFile)) {
//       throw new Error(`Config file is not found, please ensure config file exists. ${configFile}`)
//     }

//     defaultOptions = require(configFile)
//     defaultOptions = defaultOptions.default || defaultOptions
//   }

//   let globalOptions = new ClientOptions({
//     ...defaultOptions,
//     server: options.server
//   })

//   let logger = new Logger({ type: globalOptions.logType })
//   logger.listen(stdoutServ)

//   return action(options, globalOptions)
// }

// const upload = async (options: ClientCLIOptions = {}, globalOptions: ClientOptions) => {
//   let { version, message } = options
//   if (!options.hasOwnProperty('version')) {
//     let pkgFile = path.join(globalOptions.rootPath, 'package.json')

//     if (fs.existsSync(pkgFile)) {
//       let pkg = fs.readJSONSync(pkgFile)
//       version = pkg.version
//     }
//   }

//   if (!version) {
//     throw new Error('Version is not defined, please use option `--version`')
//   }

//   const folder = options.folder || globalOptions.rootPath
//   if (options.hasOwnProperty('socket')) {
//     const client = new SocketClient(globalOptions)
//     await client.connect().catch((error) => {
//       stdoutServ.error(error)
//       process.exit(3)
//     })

//     client.on('destroy', () => stdoutServ.error('Connecting closed'))
//     client.destroy()

//     stdoutServ.warn('Upload function has not been completed yet in socket mode.')
//     stdoutServ.warn(`Please use ${chalk.yellow.bold('wxparcel-deployer deploy')} to upload project.`)

//   } else {
//     const client = new HttpClient(globalOptions)

//     stdoutServ.clear()
//     stdoutServ.info(`Start uploading ${chalk.bold(folder)}`)

//     const uploadPath = options.hasOwnProperty('distributor') ? '/collector' : '/upload'
//     await client.upload(folder, version, message, uploadPath).catch((error) => {
//       stdoutServ.error(error)
//       process.exit(3)
//     })

//     stdoutServ.ok(`Project ${chalk.bold(folder)} upload completed`)
//   }
// }

// program
// .command('upload')
// .description('upload project to wechat cloud.')
// .option('--folder <folder>', 'setting wx mini program project folder path')
// .option('-v, --version <version>', 'setting upload version')
// .option('-d, --message <message>', 'setting upload message')
// .option('-c, --config <config>', 'settting config file')
// .option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
// .option('--socket', 'setting socket mode')
// .option('--distributor', 'setting distributor mode')
// .action(action(upload))

// const login = async (options: ClientCLIOptions = {}, globalOptions: ClientOptions) => {
//   if (options.hasOwnProperty('socket')) {
//     const client = new SocketClient(globalOptions)
//     await client.connect().catch((error) => {
//       stdoutServ.error(error)
//       process.exit(3)
//     })

//     client.on('qrcode', (buffer) => console.log(buffer))
//     client.on('destroy', () => stdoutServ.error('Connecting closed'))

//     await client.login()
//     client.destroy()

//     stdoutServ.warn('Upload function has not been completed yet in socket mode.')
//     stdoutServ.warn(`Please use ${chalk.yellow.bold('wxparcel-deployer deploy')} to upload project.`)

//   } else {
//     const client = new HttpClient(globalOptions)
//     const qrcode = await client.login().catch((error) => {
//       stdoutServ.error(error)
//       process.exit(3)
//     })

//     stdoutServ.info('Please scan the QR code to log in')
//     stdoutServ.log(qrcode)
//   }
// }

// program
// .command('login')
// .description('login devtool')
// .option('-c, --config <config>', 'settting config file')
// .option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
// .option('--socket', 'setting socket mode')
// .action(action(login))

// const checkin = async (_: ClientCLIOptions = {}, globalOptions: ClientOptions) => {
//   const client = new HttpClient(globalOptions)
//   await client.checkin().catch((error) => {
//     stdoutServ.error(error)
//     process.exit(3)
//   })

//   stdoutServ.ok('Login success')
// }

// program
// .command('checkin')
// .description('check login devtool')
// .option('-c, --config <config>', 'settting config file')
// .option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
// .action(action(checkin))
