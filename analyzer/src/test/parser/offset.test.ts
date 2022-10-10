/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { parse, Text } from '../../parser'

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
describe('findNodeAt offset should find Text Node', () => {
  test('loadAliased property hairTags should be injected', () => {
    const root = parse(xml)
    const node = root.findNodeAt(154)!
    expect(node).toBeDefined()
    expect(node).toBeInstanceOf(Text)
  })
})
