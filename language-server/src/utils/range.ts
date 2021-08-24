export { Range } from '@rwxml/analyzer'

export namespace Range {
  export function includes(range: Range, offset: number): boolean {
    return range.start <= offset && offset <= range.end
  }
}
