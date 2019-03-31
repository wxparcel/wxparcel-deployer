import program = require('commander')
import pkg = require('../package.json')
import './commander/server'
import './commander/deploy'

program
.version(pkg.version, '-v, --version')
.option('-q, --quiet', 'do not print any information')

const params = process.argv
!params.slice(2).length && program.outputHelp()
program.parse(params)
