import Compiler from './libs/Compiler'

const compiler = new Compiler({
  repository: 'git@github.com:DavidKk/tower-blocks.git',
  server: 'http://127.0.0.1:60843'
})

compiler.run().catch((error) => {
  console.error(error.message)
})
