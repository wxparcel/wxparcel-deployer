import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import { Stdout } from '../services/stdout'
import { wrapClientAction } from '../share/command'

const access = async (_, globalOptions: ClientOptions, stdout: Stdout) => {
  const client = new HttpClient(globalOptions)
  const response = await client.access().catch((error) => {
    stdout.error(error)
    process.exit(3)
  })

  stdout.ok(response.message)
}

program
.command('access')
.description('check login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.action(wrapClientAction(access))
