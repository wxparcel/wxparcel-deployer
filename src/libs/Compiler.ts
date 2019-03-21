import OptionManager from './OptionManager'
import DevTool from './DevTool'
import { WXOptions } from '../types'

export default class Compiler {
  private options: OptionManager

  constructor (options: WXOptions) {
    this.options = new OptionManager(options)
  }

  async run () {
    const devTool = new DevTool(this.options)
    await devTool.preview('/Users/zhongjiahao/Develop/yijian/qinxuan-wxapp/', (qrcode) => {
      console.log(qrcode)
    })
  }
}

