import { Document, parse } from '../../parser'
import $ from 'cheerio'
import { Injectable, RawTypeInfo, TypeInfoInjector, TypeInfoLoader, TypeInfoMap } from '../../rimworld-types'
import data from './anty.json'
import data_1_4 from '../data/typeinfo-1_4.json'

const xml = `\
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThingDef ParentName="BaseFilth">
    <defName>Filth_Trash</defName>
    <filth>
      <placementMask> <!-- enum (flag) type -->
        <li>Terrain</li>
        <li>Unnatural</li>
      </placementMask>
    </filth>
  </ThingDef>
</Defs>
`

describe('Enum type test', () => {
  let root: Document
  const map: TypeInfoMap = TypeInfoLoader.load(data as RawTypeInfo[])

  beforeEach(() => {
    root = parse(xml)

    const injector = new TypeInfoInjector(map)

    injector.inject(root)
  })

  test('enum type should be parsed', () => {
    const injectable = $(root).find('Defs > ThingDef > filth > placementMask').get(0)
    expect(injectable).toBeInstanceOf(Injectable)
  })

  // eslint-disable-next-line quotes
  test("enum flag's child elements should get typeInfos", () => {
    const injectable = $(root).find('Defs > ThingDef > filth > placementMask > li').get(0)
    expect(injectable).toBeInstanceOf(Injectable)
  })

  test('List<enum> should be correctly injected', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
	<AlienRace.AlienBackstoryDef>
		<defName>name</defName>
		<workDisables></workDisables>
	</AlienRace.AlienBackstoryDef>
</Defs>
`

    // TODO: move 1.4 version loader to another path
    const typeInfoMap = TypeInfoLoader.load((data_1_4 as any).rawData)
    const injector = new TypeInfoInjector(typeInfoMap)

    const document = parse(xml)
    injector.inject(document)

    const workDisablesNode = document.findNodeAt(110) as Injectable
    expect(workDisablesNode).toBeDefined()
    expect(workDisablesNode).toBeInstanceOf(Injectable)
    expect(workDisablesNode.typeInfo.isEnum).toBeTruthy()
  })
})
