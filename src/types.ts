export interface WXOptions {
  wxdevtool: string
  repository: string
}

export type StdoutHandle = (data: Buffer, type?: string) => void
