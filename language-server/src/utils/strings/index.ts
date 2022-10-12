import { Range } from '@rwxml/analyzer'

type Predicate = (char: string) => boolean

/**
 * get string between prefix and postfix. <prefix>...<offset>...<postfix>
 * @param text the text to search
 * @param offset current offset of cursor
 * @param prefix determine prefix advance to lower until this predicate returns false
 * @param postfix determine prefix advance to higher until this predicate returns false
 */
export function expandUntil(
  text: string,
  offset: number,
  prefix: Predicate,
  postfix: Predicate
): { text: string; range: Range } {
  // set is preffered but if array is short enough, array is faster than set.

  // half-open
  let start = offset
  let end = offset

  while (start > 0 && prefix(text[start - 1])) {
    start -= 1
  }

  while (end < text.length && postfix(text[end])) {
    end += 1
  }

  return {
    text: text.slice(start, end),
    range: new Range(start, end),
  }
}

export function isAlpha(c: number): boolean
export function isAlpha(c: string): boolean
export function isAlpha(c: string | number): boolean {
  if (typeof c === 'string') {
    c = c.charCodeAt(0)
  }

  return ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)) || ('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0))
}

// https://stackoverflow.com/a/950651
// https://www.ecma-international.org/publications-and-standards/standards/ecma-334/
export function isAllowedCharForClass(c: string): boolean {
  switch (c) {
    case '.':
    case '_':
      return true

    default:
      return isAlpha(c)
  }
}
