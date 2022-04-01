import { load } from 'cheerio'

export function parse(text: string) {
  return load(text, { xmlMode: true })
}
