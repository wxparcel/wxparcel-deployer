import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import { Stdout } from '../services/stdout'
import { wrapClientAction } from '../share/command'

const login = async (_, globalOptions: ClientOptions, stdout: Stdout) => {
  const client = new HttpClient(globalOptions)
  const qrcode = await client.login().catch((error) => {
    stdout.error(error)
    process.exit(3)
  })

  stdout.info('please scan the QR code to login')
  stdout.log(qrcode)
}

program
.command('login')
.description('login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.action(wrapClientAction(login))
