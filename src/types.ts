import { IncomingMessage as HttpIncomingMessage, ServerResponse as HttpServerResponse } from 'http'
import { Connection } from '../libs/libs/Server'

export type Stdout = (data: Buffer, type?: string) => void

export type ServerMiddle = (connection: Connection, request: HttpIncomingMessage, response: HttpServerResponse) => Promise<any>
export type ServerRouteHandle = (params: any, connection: Connection) => Promise<any>
export interface ServerResponse {
  status: number
  code: number
  data: any
  message: string
}

export enum LogTypes {
  console
}

export interface BaseOptions {
  tempPath?: string
  maxFileSize?: number
  logType?: keyof typeof LogTypes
}
export interface ServerBaseOptions extends BaseOptions {
  uploadPath?: string
  deployPath?: string
  qrcodePath?: string
  devToolCli?: string
  devToolServer?: string
  deployServerPort?: number
}
export interface ClientBaseOptions extends BaseOptions {
  releasePath?: string
  deployServer?: string
}
export interface ServerCLIOptions {
  port?: number
  devToolCli?: string
  devToolServ?: string
}
export interface ClientCLIOptions {
  folder?: string
  deployServ?: string
}

export type DevToolQRCodeHandle = (qrcode: string) => void

export interface ClientZipSource {
  file: string
  destination: string
}
