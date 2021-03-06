import program = require('commander')
import pkg = require('../package.json')
import './commander/status'
import './commander/server'
import './commander/upload'
import './commander/login'
import './commander/access'

program
.version(pkg.version, '-v, --version')
.option('--develop', 'set develop mode')
.option('--quiet, --silence', 'do not print any information')

const params = process.argv
!params.slice(2).length && program.outputHelp()
program.parse(params)
