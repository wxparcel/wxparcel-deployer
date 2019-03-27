import { Connection } from '../libs/libs/Server'

export type Stdout = (data: Buffer, type?: string) => void

export type ServerMiddle = (connection: Connection, request: IncomingMessage, response: ServerResponse) => Promise<any>
export type ServerRouteHandle = (params: any, connection: Connection) => Promise<any>
export interface ServerResponse {
  status: number
  code: number
  data: any
  message: string
}

export interface DeployerOptions {
  tempPath?: string
  releasePath?: string
  uploadPath?: string
  deployPath?: string
  qrcodePath?: string
  devToolCli?: string
  devToolServer?: string
  deployServerPort?: number
  maxFileSize?: number
}

export interface WXParcelDeployerRepsonseOptions {
  methods?: string | Array<string>
  code?: number
  data?: any
  status?: number
  message?: string
}








import { IncomingMessage, ServerResponse } from 'http'

export type WxParcelQrCodeCallback = (qrcode: string) => void


export interface WxParcelZipSource {
  file: string
  destination: string
}


