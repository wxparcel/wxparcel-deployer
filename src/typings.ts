import HttpConnection from './libs/http/Connection'
import { Socket } from 'socket.io'

export type Stdout = (data: Buffer, type?: string) => void

export interface ChildProcessMap {
  token: Symbol
  kill: () => void
}

export interface CommandError extends Error {
  code?: number
}

// server
// -----------------

export interface WebSocketRequestMessage {
  action: string
  payload: any
}

export interface WebSocketResponseMessage {
  action: string
  payload: StandardResponse
}

export type WebSocketEeventAction = (payload: any, feedback: (data?: StandardResponse) => void, socket: Socket) => Promise<any>

export interface WebSocketEevent {
  type: string
  action: (socket: Socket, action: string, payload: any) => Promise<any>
}

export interface StandardResponse {
  status?: number
  code?: number
  data?: any
  message?: string
}

export type HTTPServerRoute = (connection: HttpConnection) => Promise<any>
export type HTTPServerRouteHandler = (params: any, connection: HttpConnection) => Promise<any>

// logger
// -----------------

export enum LogTypes {
  console
}

export interface LoggerOptions {
  type?: keyof typeof LogTypes
  detailed?: boolean
}

// Options
// --------------

export interface BaseOptions {
  uid?: string
  tempPath?: string
  maxFileSize?: number
  logType?: keyof typeof LogTypes
  isDevelop?: boolean
}
export interface ServerBaseOptions extends BaseOptions {
  uploadPath?: string
  deployPath?: string
  qrcodePath?: string
  devToolCli?: string
  devToolServer?: string
  port?: number
}
export interface ClientBaseOptions extends BaseOptions {
  releasePath?: string
  server?: string
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
  socket?: any
}

export type DevToolQRCodeHandle = (qrcode: string | Buffer) => void

export interface ClientZipSource {
  file: string
  destination: string
}
