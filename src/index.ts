import Compiler from './libs/Compiler'

const compiler = new Compiler({
  wxdevtool: '/Applications/wechatwebdevtools.app',
  repository: 'git@github.com:DavidKk/tower-blocks.git'
})

compiler.run().catch((error) => {
  console.error(error.message)
})
