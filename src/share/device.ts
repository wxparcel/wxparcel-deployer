import * as os from 'os'

export const isOSX = 'darwin' === os.platform()
export const isWin = 'win32' === os.platform()
