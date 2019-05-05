import program = require('commander')
import ClientOptions from '../client/OptionManager'
import HttpClient from '../client/Http'
import WebSocketClient from '../client/WebSocket'
import { Stdout } from '../services/stdout'
import { wrapClientAction } from '../share/command'

const login = async (options, globalOptions: ClientOptions, stdout: Stdout) => {
  const catchError = (error) => {
    stdout.error(error)
    process.exit(3)
  }

  const showQRcode = (qrcode: string) => {
    console.log('please scan the QR code to login')
    console.log(qrcode)
  }

  if (options.socket) {
    const client = new WebSocketClient(globalOptions)
    client.connect(globalOptions.deployServer)

    const response = await client.login(showQRcode).catch(catchError)
    stdout.info(response.message)

    client.destroy()

  } else {
    const client = new HttpClient(globalOptions)
    const qrcode = await client.login().catch(catchError)
    showQRcode(qrcode)
  }
}

program
.command('login')
.description('login devtool')
.option('-c, --config <config>', 'settting config file')
.option('--server <server>', 'setting upload server url, default 0.0.0.0:3000')
.option('--socket', 'setting websocket mode, default false')
.action(wrapClientAction(login))
