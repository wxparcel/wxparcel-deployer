import { isWin } from './device'
import { spawnPromisify } from './fns'

const cli = isWin ? 'where' : 'which'

export const exists = async (command: string) => {
  try {
    await spawnPromisify(cli, [command])
  } catch (error) {
    throw new Error(`Command ${command} is not support.`)
  }
}
