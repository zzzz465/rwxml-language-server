/* eslint-disable @typescript-eslint/no-non-null-assertion */
import DomHandler, { Comment, Document, Element, Text } from '../../parser/domhandler'
import { Parser } from '../../parser/htmlparser2'
import * as cheerio from 'cheerio'
import { readFileSync } from 'fs'
import path from 'path'

function parse(text: string): Document {
  const domHandler = new DomHandler()
  const parser = new Parser(domHandler)
  parser.end(text)

  return domHandler.root
}

const longXML = readFileSync(path.resolve(__dirname, 'longXML.xml'))

describe('XML Parsing test', () => {
  const exampleXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData SomeAttribute="foobar" attribWithSingleQuote='singlequote'>
<name>Paniel the Automata Beta 1.3</name>
<author>AhnDemi</author>
<packageId>AhnDemi.PanieltheAutomataBetatwo</packageId>
<supportedVersions>
  <li>1.3</li>
</supportedVersions>
<description>
Paniel the Automata
</description>
</ModMetaData>\
`
  test('root document should contains rawXML', () => {
    const root = parse(exampleXML) as Document

    expect(root).toBeInstanceOf(Document)
    expect(root.rawText).toEqual(exampleXML)
  })

  test('it should parse xml with ranges', () => {
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end(exampleXML)

    const root = domHandler.root
    const $ = cheerio.load(root as any, { xmlMode: true })

    const name = $('ModMetaData > name').text()
    expect(name).toEqual('Paniel the Automata Beta 1.3')

    const author = $('ModMetaData > author').text()
    expect(author).toEqual('AhnDemi')

    const packageIdNode = $('ModMetaData > packageId').get(0)?.firstChild as unknown as Text
    const packageId = $('ModMetaData > packageId').text()
    expect(packageId).toEqual('AhnDemi.PanieltheAutomataBetatwo')
    expect(packageIdNode).toBeInstanceOf(Text)
    expect(packageIdNode.dataRange.start).toEqual(191) // 191 ~ 223
    expect(packageIdNode.dataRange.end).toEqual(223)

    const description = $('ModMetaData > description').text()
    expect(description.trim()).toEqual('Paniel the Automata')

    const supportedVersions = $('ModMetaData > supportedVersions > li')
      .map((_, el) => $(el).text())
      .toArray()
    expect(supportedVersions).toEqual(['1.3'])
  })

  test('xml parser range test', () => {
    const root = parse(exampleXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const ModMetaData = $('ModMetaData').get(0) as unknown as Element // 40 ~ 354
    expect(ModMetaData.nodeRange.start).toEqual(40)
    expect(ModMetaData.nodeRange.end).toEqual(355)

    expect(ModMetaData.openTagRange.start).toEqual(40)
    expect(ModMetaData.openTagRange.end).toEqual(112)
    expect(ModMetaData.openTagRange.length).toEqual(72)

    expect(ModMetaData.openTagNameRange.start).toEqual(41)
    expect(ModMetaData.openTagNameRange.end).toEqual(52)
    expect(ModMetaData.openTagNameRange.length).toEqual(11)

    expect(ModMetaData.closeTagRange.start).toEqual(341)
    expect(ModMetaData.closeTagRange.end).toEqual(355)
    expect(ModMetaData.closeTagNameRange.start).toEqual(343)
    expect(ModMetaData.closeTagNameRange.end).toEqual(354)

    const someAttrib = ModMetaData.attribs['SomeAttribute']
    expect(someAttrib).not.toBeNull()
    expect(someAttrib.name).toBe('SomeAttribute')
    expect(someAttrib.value).toBe('foobar')
    expect(someAttrib.nameRange.start).toBe(53)
    expect(someAttrib.nameRange.end).toBe(66)
    expect(someAttrib.valueRange.start).toBe(68)
    expect(someAttrib.valueRange.end).toBe(74)
  })

  test('text must return valid TextNode', () => {
    const root = parse(exampleXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const descriptionNode = $('description')

    expect(descriptionNode.text()).toEqual('\nPaniel the Automata\n')
  })

  test('xml parser text node range test', () => {
    const root = parse(exampleXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const packageIdNode = $('packageId').get(0) as unknown as Element

    expect($(packageIdNode as any).text()).toEqual('AhnDemi.PanieltheAutomataBetatwo')
    expect(packageIdNode.nodeRange.length).toEqual(55)
  })

  test('it should return Element instance', () => {
    const domHandler = new DomHandler()
    const parser = new Parser(domHandler)

    parser.end(exampleXML)

    const root = domHandler.root
    const $ = cheerio.load(root as any, { xmlMode: true })

    const elements = $('*')

    const nodes = elements.toArray()

    for (const node of nodes) {
      expect(node instanceof Element).toBeTruthy()
    }
  })

  test('range should work on TextNode', () => {
    const root = parse(exampleXML)

    const text = root.findNodeAt(201) as unknown as Text // <packageId>Ahndemi.P[a]...</packageId>
    expect(text).toBeInstanceOf(Text)
    expect(text.dataRange.start).toBe(191)
    expect(text.dataRange.end).toBe(223)
  })

  // eslint-disable-next-line quotes
  test("Text and Comment's nodeRange and dataRange should be parsed correctly", () => {
    const root = parse(longXML.toString())

    // line 594, PNRP_T|ierB_Apparel
    const offset = 18134
    const nodeStart = 18128
    const nodeEnd = 18146
    const rangedNode = root.findNodeAt(offset)! as Text

    expect(rangedNode).not.toBeUndefined()
    expect(rangedNode).toBeInstanceOf(Text)
    expect(rangedNode.nodeRange.start).toEqual(nodeStart)
    expect(rangedNode.nodeRange.end).toEqual(nodeEnd)
    expect(rangedNode.dataRange.start).toEqual(rangedNode.nodeRange.start)
    expect(rangedNode.dataRange.end).toEqual(rangedNode.nodeRange.end)

    const commentNode = root.findNodeAt(1312)! as Comment // line 49, 기본|옷

    expect(commentNode).not.toBeUndefined()
    expect(commentNode).toBeInstanceOf(Comment)
    expect(commentNode.nodeRange.start).toEqual(1270)
    expect(commentNode.nodeRange.end).toEqual(1354)
    expect(commentNode.dataRange.start).toEqual(1274)
    expect(commentNode.dataRange.end).toEqual(1351)
  })
})

describe('broken XML parsing test', () => {
  const attribBrokenXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData validAttrib invalidEqual= invalidEqual="asd>
<name>Paniel the Automata Beta 1.3</name>
</ModMetaData>\
`

  const notclosedXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<ModMetaData>
  <name>Paniel the Automata Beta 1.3</
  <author>AhnDemi</author>
  <packageId>AhnDemi.PanieltheAutomataBetatwo</packageId>
</ModMetaData>\
`

  test('invalid xml should be parsed', () => {
    const root = parse(attribBrokenXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const nameNode = $('ModMetaData > name')
    expect(nameNode.text()).toEqual('Paniel the Automata Beta 1.3')
  })

  test('unclosed xml should be parsed', () => {
    const root = parse(notclosedXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const nameNode = $('ModMetaData > name')
    expect(nameNode.text()).toBe('Paniel the Automata Beta 1.3')
  })
})
