import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import StdoutServ from '../services/stdout'
import { wrapClientAction } from '../share/command'

const access = async (_, globalOptions: ClientOptions) => {
  const client = new HttpClient(globalOptions)
  await client.access().catch((error) => {
    StdoutServ.error(error)
    process.exit(3)
  })

  StdoutServ.ok('logined')
}

program
.command('access')
.description('check login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.action(wrapClientAction(access))
