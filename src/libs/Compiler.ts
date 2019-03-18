import OptionManager from './OptionManager'
import DevTool from './DevTool'
import Repository from './Repository'
import { exists as commandExists } from '../share/command'
import { WXOptions } from '../types'

export default class Compiler {
  private options: OptionManager

  constructor (options: WXOptions) {
    this.options = new OptionManager(options)
  }

  async run () {
    await commandExists('git')

    const repository = new Repository(this.options)
    const devTool = new DevTool(this.options)

    const { repository: repo } = this.options
    const folder = await repository.clone(repo)

    await devTool.login()
    await devTool.preview('/Users/zhongjiahao/Develop/yijian/qinxuan-wxapp/')
  }
}
