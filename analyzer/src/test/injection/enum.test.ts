import { Document, parse } from '../../parser'
import $ from 'cheerio'
import { Injectable, RawTypeInfo, TypeInfoInjector, TypeInfoLoader, TypeInfoMap } from '../../rimworld-types'
import data from './core.json'

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
  let map: TypeInfoMap

  beforeEach(() => {
    root = parse(xml)

    map = TypeInfoLoader.load(data as RawTypeInfo[])
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
})
