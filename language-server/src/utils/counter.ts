export class Counter<T> {
  private map = new Map<T, number>()

  add(value: T): number {
    const before = this.map.get(value) ?? 0
    this.map.set(value, before + 1)

    const after = this.map.get(value)
    return after!
  }

  remove(value: T): number {
    const after = (this.map.get(value) ?? 1) - 1
    if (after === 0) {
      this.map.delete(value)
    }

    return this.map.get(value) ?? 0
  }

  values(): T[] {
    return [...this.map.keys()]
  }
}
