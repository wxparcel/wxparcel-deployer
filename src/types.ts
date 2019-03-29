import { IncomingMessage as HttpIncomingMessage, ServerResponse as HttpServerResponse } from 'http'
import { ChildProcess } from 'child_process'
import Connection from './libs/Connection'

export type Stdout = (data: Buffer, type?: string) => void

export interface ChildProcessMap {
  token: Symbol
  kill: () => void
}

export interface CommandError extends Error {
  code?: number
}

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

export interface LoggerOptions {
  type?: keyof typeof LogTypes
}

export interface BaseOptions {
  uid?: string
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
  config?: string
  port?: number
  devToolCli?: string
  devToolServ?: string
}
export interface ClientCLIOptions {
  config?: string
  version?: string
  message?: string
  folder?: string
  server?: string
}

export type DevToolQRCodeHandle = (qrcode: string) => void

export interface ClientZipSource {
  file: string
  destination: string
}
