/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Element, parse, Text } from '../../parser'

const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <CultureDef>
    <defName>test_def_1</defName>
    <ideoNameMaker MayRequire="Ludeon.RimWorld.Ideology">NamerIdeoAstropolitan</ideoNameMaker>
  </CultureDef>
</Defs>
`

// jest 가 <, > 를 인식 못함..
describe('findNodeAt offset should find the right node', () => {
  test('offset 154 should find Text Node inside ideoNameMaker tag', () => {
    const root = parse(xml)
    const node = root.findNodeAt(154)!
    expect(node).toBeDefined()
    expect(node).toBeInstanceOf(Text)
  })

  test('(offset 91) closing tag should be found as Element Node', () => {
    const root = parse(xml)
    const node = root.findNodeAt(91)!
    expect(node).toBeDefined()
    expect(node).toBeInstanceOf(Element)
  })
})
