import { Document, parse } from '../../parser'
import $ from 'cheerio'
import { Def, TypedElement, RawTypeInfo, TypeInfoInjector, TypeInfoLoader, TypeInfoMap } from '../../rimworld-types'
import data from './anty.json'

const xml = `\
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <HairDef>
    <defName>AThair_E</defName>
    <label>AT_E</label>
    <hairGender>Male</hairGender>
    <texPath>Antylike/Hairs/AThair_E</texPath>
    <hairTags>
      <li>AThair</li>
    </hairTags>
  </HairDef>
</Defs>
`

// jest 가 <, > 를 인식 못함..
describe('LoadAliasAttribute testing with HairTags', () => {
  let root: Document
  const map: TypeInfoMap = TypeInfoLoader.load(data as RawTypeInfo[])

  beforeEach(() => {
    root = parse(xml)

    const injector = new TypeInfoInjector(map)

    injector.inject(root)
  })

  test('it should be parsed', () => {
    const node = $(root).find('Defs > HairDef').get(0) as unknown as TypedElement

    expect(node).toBeInstanceOf(Def)
  })

  test('loadAliased property hairTags should be injected', () => {
    const node = $(root).find('Defs > HairDef > hairTags').get(0) as unknown as TypedElement

    expect(node).toBeInstanceOf(TypedElement)
  })
})
