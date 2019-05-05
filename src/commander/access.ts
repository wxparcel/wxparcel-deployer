import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import WebSocketClient from '../client/WebSocket'
import { Stdout } from '../services/stdout'
import { wrapClientAction } from '../share/command'
import { ClientCLIOptions } from '../typings'

const access = async (options: ClientCLIOptions = {}, globalOptions: ClientOptions, stdout: Stdout) => {
  const catchError = (error) => {
    stdout.error(error)
    process.exit(3)
  }

  if (options.socket) {
    const client = new WebSocketClient(globalOptions)
    client.connect(globalOptions.deployServer)

    const response = await client.access().catch(catchError)
    stdout.info(response.message)

    client.destroy()

  } else {
    const client = new HttpClient(globalOptions)
    const response = await client.access().catch(catchError)
    stdout.info(response.message)
  }
}

program
.command('access')
.description('check login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.option('--socket', 'setting websocket mode, default false')
.action(wrapClientAction(access))
