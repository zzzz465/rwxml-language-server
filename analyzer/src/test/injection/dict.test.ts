import { Document, parse } from '../../parser'
import * as cheerio from 'cheerio'
import { TypedElement, RawTypeInfo, TypeInfoInjector, TypeInfoLoader, TypeInfoMap } from '../../rimworld-types'
import data from './anty.json'
import { injector_1_4 } from '../data/injector'

const xml = `\
<?xml version="1.0" encoding="utf-8"?>
<Defs>
	<AlienRace.ThingDef_AlienRace ParentName="AT_PawnBase" Name="AntyBase">
		<defName>Anty</defName>
		<label>Anty</label>
		<alienRace>
			<styleSettings> <!-- Dictionary<Type, StyleSettings> -->
				<li>
					<key>HairDef</key>
					<value>
						<hasStyle>true</hasStyle>
						<styleTagsOverride>
							<li>AThair</li>
						</styleTagsOverride>
					</value>
				</li>
				<li>
					<key>BeardDef</key>
					<value>
						<hasStyle>false</hasStyle>
					</value>
				</li>
				<li>
					<key>TattooDef</key>
					<value>
						<hasStyle>false</hasStyle>
					</value>
				</li>
			</styleSettings>
		</alienRace>
	</AlienRace.ThingDef_AlienRace>
</Defs>
`

// jest 가 <, > 를 인식 못함..
describe('Dictionary K, V type test', () => {
  let root: Document
  const map: TypeInfoMap = TypeInfoLoader.load(data as RawTypeInfo[])

  beforeEach(() => {
    root = parse(xml)

    const injector = new TypeInfoInjector(map)

    injector.inject(root)
  })

  test('dictionary type should be parsed as generic', () => {
    const $ = cheerio.load(root as any, { xmlMode: true })
    const dictNode = $('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings')
      .get(0) as unknown as TypedElement

    expect(dictNode).not.toBeUndefined()
    expect(dictNode).toBeInstanceOf(TypedElement)
  })

  test('dictionary K, V should have li as key with type K', () => {
    const $ = cheerio.load(root as any, { xmlMode: true })
    const nodes = $('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings > li > key')
      .toArray() as unknown as TypedElement[]

    expect(nodes.length).toBeGreaterThan(0)

    for (const node of nodes) {
      expect(node.tagName).toBe('key')
      expect(node).toBeInstanceOf(TypedElement)
      expect(node.typeInfo.isType()).toBeTruthy()
    }
  })

  test('dictionary K, V should have value as value with type V', () => {
    const $ = cheerio.load(root as any, { xmlMode: true })
    const nodes = $('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings > li > value')
      .toArray() as unknown as TypedElement[]

    expect(nodes.length).toBeGreaterThan(0)

    for (const node of nodes) {
      expect(node.tagName).toBe('value')
      expect(node).toBeInstanceOf(TypedElement)
      expect(node.typeInfo.fullName).toBe('AlienRace.StyleSettings')
    }
  })

  test('dictionary K, V test', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <AlienRace.ThingDef_AlienRace ParentName="AntyBase">
    <defName>AT_dreadnought</defName>
    <alienRace>
      <styleSettings Inherit="False">
        <li>
          <key>HairDef</key>
          <value>
            <hasStyle>false</hasStyle>
          </value>
        </li>
      </styleSettings>
    </alienRace>
  </AlienRace.ThingDef_AlienRace>
</Defs>
`

    const root = parse(xml)
    injector_1_4.inject(root)

    const styleSettingsNode = root.findNodeAt(164) as TypedElement
    expect(styleSettingsNode).toBeDefined()
    expect(styleSettingsNode).toBeInstanceOf(TypedElement)
    expect(styleSettingsNode.typeInfo.isDictionary()).toBe(true)

    const liNode = root.findNodeAt(203) as TypedElement
    expect(liNode).toBeDefined()
    expect(liNode).toBeInstanceOf(TypedElement)
  })
})
