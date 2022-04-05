
export class ExtractionError extends Error {
  constructor(message?: string, public readonly command?: string) {
    super(message)
  }
}