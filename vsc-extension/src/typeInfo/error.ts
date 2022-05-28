export class ExtractionError extends Error {
  constructor(message?: string, public readonly command?: string) {
    super(message)
  }

  toJSON() {
    return {
      message: this.message,
      command: this.getBase64EncodedCommand(),
    }
  }

  getBase64EncodedCommand() {
    if (this.command) {
      return Buffer.from(this.command).toString('base64')
    } else {
      return ''
    }
  }
}
