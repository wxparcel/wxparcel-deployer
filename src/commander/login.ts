import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import StdoutServ from '../services/stdout'
import { wrapClientAction } from '../share/command'

const login = async (_, globalOptions: ClientOptions) => {
  const client = new HttpClient(globalOptions)
  const qrcode = await client.login().catch((error) => {
    StdoutServ.error(error)
    process.exit(3)
  })

  StdoutServ.info('Please scan the QR code to log in')
  StdoutServ.log(qrcode)
}

program
.command('login')
.description('login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.action(wrapClientAction(login))
