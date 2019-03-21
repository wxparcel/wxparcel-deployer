export interface WXOptions {
  server: string
  repository: string
}

export type StdoutHandle = (data: Buffer, type?: string) => void
export type DevToolQrCodeCallback = (qrcode: string) => void
