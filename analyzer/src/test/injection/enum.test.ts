/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Document, parse, Text } from '../../parser'
import $ from 'cheerio'
import { TypedElement, RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import data from './anty.json'
import data_1_4 from '../data/typeinfo-1_4.json'
import { not } from 'cheerio/lib/api/traversing'

// FIXME: consuming data multiple times creates circular reference error.

describe('Enum type test', () => {
  const injector_1_3 = new TypeInfoInjector(TypeInfoLoader.load(data as RawTypeInfo[]))
  const injector_1_4 = new TypeInfoInjector(TypeInfoLoader.load((data_1_4 as any).rawData as RawTypeInfo[]))

  test('enum type should be parsed', () => {
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

    const root: Document = parse(xml)

    injector_1_3.inject(root)

    const injectable = $(root).find('Defs > ThingDef > filth > placementMask').get(0)
    expect(injectable).toBeInstanceOf(TypedElement)
  })

  // eslint-disable-next-line quotes
  test("enum flag's child elements should get typeInfos", () => {
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

    const root: Document = parse(xml)

    injector_1_3.inject(root)

    const injectable = $(root).find('Defs > ThingDef > filth > placementMask > li').get(0)
    expect(injectable).toBeInstanceOf(TypedElement)
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

    const document = parse(xml)
    injector_1_4.inject(document)

    const workDisablesNode = document.findNodeAt(110) as TypedElement
    expect(workDisablesNode).toBeDefined()
    expect(workDisablesNode).toBeInstanceOf(TypedElement)
    expect(workDisablesNode.typeInfo.isEnum).toBeTruthy()
  })

  test('enum should have TypeInfo', () => {
    const xml = `
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

    const document = parse(xml)
    injector_1_4.inject(document)

    const terrainTextNode = document.findNodeAt(194)! as Text
    expect(terrainTextNode).toBeDefined()
    expect(terrainTextNode).toBeInstanceOf(Text)
    expect(terrainTextNode.data).toBe('Terrain')
    expect(terrainTextNode.typeInfo).not.toBeNull()
    expect(terrainTextNode.typeInfo!.isEnum).toBeTruthy()
  })

  test('integer-flagged enum should be true for isInteger()', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThingDef ParentName="CrashedShipPartBase">
    <defName>PsychicDronerShipPart</defName>
    <comps>
      <li Class="CompProperties_CausesGameCondition_PsychicEmanation">
        <droneLevel>2</droneLevel> <!-- check here -->
      </li>
    </comps>
  </ThingDef>
</Defs>
`

    // TODO: implement this

    const document = parse(xml)
    injector_1_4.inject(document)

    const droneLevelNode = document.findNodeAt(233)! as TypedElement
    expect(droneLevelNode).toBeDefined()
    expect(droneLevelNode).toBeInstanceOf(TypedElement)
    expect(droneLevelNode.typeInfo).toBeDefined()
    expect(droneLevelNode.typeInfo.isInteger()).toBeFalsy()
  })
})
