import { Socket as SocketIOSocket } from 'socket.io'
import { Socket as SocketIOClientSocket } from 'socket.io-client'
import Connection from './libs/Connection'
import SocketStream from './libs/SocketStream'
import { Stdout as StdoutService } from './services/stdout'

export type ChildProcessStdout = (data: Buffer, type?: string) => void

export interface ChildProcessMap {
  token: Symbol
  kill: () => void
}

export interface StdoutOptions {
  autoDatetime?: boolean
}

export interface ClientCLIOptions {
  config?: string
  version?: string
  message?: string
  folder?: string
  server?: string
  socket?: boolean
}

export interface ServerCLIOptions {
  config?: string
  port?: number
  devtool?: string
  devtoolCli?: string
  devtoolIde?: string
}

export interface BaseOptions {
  tempPath?: string
  maxFileSize?: number
  logMethod?: string | Array<string>
  isDevelop?: boolean
}

export interface ClientBaseOptions extends BaseOptions {
  releasePath?: string
  server?: string
}

export interface ServerBaseOptions extends BaseOptions {
  uploadPath?: string
  deployPath?: string
  qrcodePath?: string
  devToolServer?: string
  port?: number
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

export type DevToolCommand = (statsFile: string, killToken: symbol) => Promise<any>

export interface CommandError extends Error {
  code?: number
}

export type ServiceCommand = (killToken: symbol) => Promise<void>

export type Router = (connection: Connection, stdout: StdoutService) => Promise<any>
export type RouterHandle = (params: any, connection: Connection, stdout: StdoutService) => Promise<any>

export interface StandardJSONResponse {
  status?: number
  code?: number
  data?: any
  message?: string
}

export interface Tunnel extends Connection {
  params: RegExpExecArray,
  stdout: StdoutService,
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
  action: (socket: SocketIOSocket | typeof SocketIOClientSocket, action: string, payload: WebSocketPayload, stream: SocketStream, stdout: StdoutService) => Promise<any>
  stream: boolean
}

export interface WebSocketTunnel {
  payload: WebSocketPayload
  stream: SocketStream
  stdout: StdoutService,
  socket: SocketIOSocket | typeof SocketIOClientSocket
  feedback: (content?: StandardJSONResponse) => void
  send: (action: string, content?: StandardJSONResponse) => void
}

// Options
// --------------

export type DevToolQRCodeHandle = (qrcode: string | Buffer) => void

export interface ClientZipSource {
  file: string
  destination: string
}
