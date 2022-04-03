import { Document, Element, parse } from '../../parser'
import $ from 'cheerio'
import { Injectable, RawTypeInfo, TypeInfoInjector, TypeInfoLoader, TypeInfoMap } from '../../rimworld-types'
import data from './anty.json'

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

describe('Dictionary<K, V> type test', () => {
  let root: Document
  const map: TypeInfoMap = TypeInfoLoader.load(data as RawTypeInfo[])

  beforeEach(() => {
    root = parse(xml)

    const injector = new TypeInfoInjector(map)

    injector.inject(root)
  })

  test('dictionary type should be parsed as generic', () => {
    const dictNode = $(root)
      .find('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings')
      .get(0) as unknown as Injectable

    expect(dictNode).not.toBeUndefined()
    expect(dictNode).toBeInstanceOf(Injectable)
  })

  test('dictionary<K, V> should have <li> as key with type K', () => {
    const nodes = $(root)
      .find('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings > li > key')
      .toArray() as unknown as Injectable[]

    for (const node of nodes) {
      expect(node.tagName).toBe('key')
      expect(node).toBeInstanceOf(Injectable)
      expect(node.typeInfo.isType()).toBeTruthy()
    }
  })

  test('dictionary<K, V> should have <value> as value with type V', () => {
    const nodes = $(root)
      .find('Defs > AlienRace\\.ThingDef_AlienRace > alienRace > styleSettings > value')
      .toArray() as unknown as Injectable[]

    for (const node of nodes) {
      expect(node.tagName).toBe('li')
      expect(node).toBeInstanceOf(Injectable)
      expect(node.typeInfo.isType()).toBeTruthy()
    }
  })
})
