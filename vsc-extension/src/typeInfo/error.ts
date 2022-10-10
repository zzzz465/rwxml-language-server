export class ExtractionError extends Error {
  constructor(message?: string, public readonly command?: string) {
    super(message)
  }

  toJSON(): { message: string; command: string | null } {
    return {
      message: this.message,
      command: this.getBase64EncodedCommand(),
    }
  }

  getBase64EncodedCommand(): string | null {
    if (this.command) {
      return Buffer.from(this.command).toString('base64')
    } else {
      return null
    }
  }
}
