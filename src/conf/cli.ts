import os = require('os')
import path = require('path')

const platform = os.platform()
export const isMacOS = 'darwin' === platform
export const isWindows = 'win32' === platform
export const isLinux = 'linux' === platform
export const homedir = os.homedir()

export let cli = ''
export let ide = ''

if (isMacOS) {
  cli = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
  ide = path.join(homedir, '/Library/Application Support/微信web开发者工具/Default/.ide')
} else if (isWindows) {
  cli = 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'
  ide = path.join(homedir, '/AppData/Local/微信web开发者工具/User Data/Default/.ide')
} else if (isLinux) {
  cli = path.join(homedir, '/wechat_web_devtools/bin/cli')
  ide = path.join(homedir, '.config/wechat_web_devtools/Default/.ide')
}
