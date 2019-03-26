import OptionManager from './libs/OptionManager'
import Client from './libs/Client'

const options = new OptionManager({

})

const client = new Client(options)
client.uploadProject('/Users/zhongjiahao/Develop/yijian/qinxuan-wxapp')
.then((response: any) => {
  const { message } = response.data
  console.log(message)
})
.catch((error) => {
  console.log(error.message)
})
