import os = require('os')
import path = require('path')

export const isOSX = 'darwin' === os.platform()
export const isWin = 'win32' === os.platform()
export const homedir = os.homedir()

export let cli = ''
export let ide = ''

if (isOSX) {
  cli = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
  ide = path.join(homedir, '/Library/Application Support/微信web开发者工具/Default/.ide')
} else if (isWin) {
  ide = path.join(homedir, '/AppData/Local/微信web开发者工具/User Data/Default/.ide')
}
