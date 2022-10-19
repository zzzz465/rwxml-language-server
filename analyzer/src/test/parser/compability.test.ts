import $ from 'cheerio'
import { readFileSync } from 'fs'
import stringify from 'json-stringify-safe'
import { join } from 'path'
import { parse } from '../../parser'

const expectedJsonString = readFileSync(join(__dirname, 'jsonSerializedDocument.json'), 'utf8')
const expectedJson = JSON.parse(expectedJsonString)

$._options.xmlMode = true

// TODO: fix this test
describe('cheerio compability test', () => {
  test('node should work with cheerio API', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
</Defs>
`
    const doc = parse(xml)
    const docSerialized = stringify(doc)
    const actual = JSON.parse(docSerialized)
    // actual is used for getting serialized json on debug mode.
    Node

    const x = $(doc)
    const y = $.load(xml, { xml: true })

    const defsNode = $(doc).find('Defs').get(0) as unknown as Element
    expect(defsNode).toBeDefined()
  })
})
