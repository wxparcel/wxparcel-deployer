import { Socket as WebSocket } from 'socket.io'
import { Socket as WebSocketClient } from 'socket.io-client'

export type Stdout = (data: Buffer, type?: string) => void

export interface ChildProcessMap {
  token: Symbol
  kill: () => void
}

import Connection from './libs/Connection'

export interface StdoutOptions {
  autoDatetime?: boolean
}

export interface BaseOptions {
  uid?: string
  tempPath?: string
  maxFileSize?: number
  logMethod?: string | Array<string>
  isDevelop?: boolean
}

export enum LoggerMethods {
  CONSOLE = 'CONSOLE',
  FILE = 'FILE'
}

export enum LoggerTypes {
  LOG = 'LOG',
  OK = 'OK',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CLEAR = 'CLEAR'
}

export interface LoggerOptions {
  method?: string | Array<string>
  logFile?: string
}

export type LoggerFormat = (content: string) => string
export type LoggerHeads = Array<string | { content: string, format?: LoggerFormat }>
export type LoggerMessages = Array<string | { content: string | Error, format?: LoggerFormat }>

export interface ServerCLIOptions {
  config?: string
  port?: number
  devToolCli?: string
}

export interface ServerBaseOptions extends BaseOptions {
  uploadPath?: string
  deployPath?: string
  qrcodePath?: string
  devToolCli?: string
  port?: number
}

export interface CommandError extends Error {
  code?: number
}

export type Router = (connection: Connection) => Promise<any>
export type RouterHandle = (params: any, connection: Connection) => Promise<any>

export interface StandardJSONResponse {
  status?: number
  code?: number
  data?: any
  message?: string
}

export interface Tunnel extends Connection {
  params: RegExpExecArray,
  feedback: (content?: StandardJSONResponse) => void
}

export interface WebSocketMessage {
  action: string
  payload: any
}

export interface WebSocketPayload {
  [key: string]: any
}

export interface WebSocketEevent {
  type: string
  action: (socket: WebSocket | typeof WebSocketClient, action: string, payload: WebSocketPayload) => Promise<any>
}

export interface WebSocketTunnel {
  payload: WebSocketPayload
  socket: WebSocket | typeof WebSocketClient
  feedback: (content?: StandardJSONResponse) => void
}

// Options
// --------------

export interface ClientBaseOptions extends BaseOptions {
  releasePath?: string
  server?: string
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
