import cheerio from 'cheerio'

cheerio._options.xmlMode = true

export function parse(text: string) {
  const $ = cheerio.load(text, { xmlMode: true })

  return $
}
