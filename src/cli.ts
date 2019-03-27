import * as program from 'commander'
import * as pkg from '../package.json'
import './commander/server'
import './commander/client'

const help = () => {

}

program
.version(pkg.version, '-v, --version')
.option('-q, --quiet', 'do not print any information')
.on('--help', help)

const params = process.argv
!params.slice(2).length && program.outputHelp()
program.parse(params)
