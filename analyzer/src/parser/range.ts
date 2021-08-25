export class Range {
  start: number
  end: number

  constructor(start?: number, end?: number) {
    this.start = start ?? -1
    this.end = end ?? -1
  }

  isValid() {
    return this.length() >= 0
  }

  length() {
    return this.end - this.start + 1
  }

  copyFrom(other: Range) {
    this.start = other.start
    this.end = other.end
  }

  clone() {
    const newRange = new Range()
    newRange.copyFrom(this)

    return newRange
  }
}
