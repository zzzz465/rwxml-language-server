import * as cheerio from 'cheerio'

export function parse(text: string) {
  const $ = cheerio.load(text, { xmlMode: true })

  return $
}
