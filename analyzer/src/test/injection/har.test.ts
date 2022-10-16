import $ from 'cheerio'
import { RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../..'
import { parse } from '../../parser'
import { Def } from '../../rimworld-types'
import har from './anty.json'

$._options.xmlMode = true

const backstoryDef = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <!--==================================== 베이스 ====================================-->
  <AlienRace.BackstoryDef Abstract="True" Name="BasePanielBackStory">
    <bodyTypeMale>Female</bodyTypeMale>
    <bodyTypeFemale>Female</bodyTypeFemale>
    <forcedHediffs>
      <!--<li>PanielBaseHediff</li>
			<li>PN_AutomatonFuel_Addiction</li>
			<li>PN_Maintenance</li>-->
    </forcedHediffs>
    <spawnCategories>
      <li>PN_storys</li>
    </spawnCategories>
  </AlienRace.BackstoryDef>
</Defs>
`

describe('API with HAR2.0 test', () => {
  test('injector should inject TypeInfo against AlienRace.BackStoryDef', () => {
    const root = parse(backstoryDef)

    const map = TypeInfoLoader.load(har as RawTypeInfo[])
    const injector = new TypeInfoInjector(map)

    injector.inject(root)

    const def = $(root).find('AlienRace\\.BackstoryDef').get(0) as unknown as Def
    expect(def).toBeInstanceOf(Def)
  })
})
