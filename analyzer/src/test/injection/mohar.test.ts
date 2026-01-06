import { Element, parse } from '../../parser'
import * as cheerio from 'cheerio'
import { TypedElement, RawTypeInfo, TypeInfoInjector, TypeInfoLoader } from '../../rimworld-types'
import data from './anty.json'

const exampleXML = `\
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <HediffDef>
  <defName>Antypheromone_SuicideHigh_Proty</defName>
  <hediffClass>HediffWithComps</hediffClass>
  <label>Antypheromone_SuicideHigh_Proty</label>
  <description>!!!</description>
  <defaultLabelColor>(1,0,0.5)</defaultLabelColor>
  <scenarioCanAdd>false</scenarioCanAdd>
  <maxSeverity>1.0</maxSeverity>
  <isBad>false</isBad>
  <comps>
    <li Class="MoharHediffs.HeDiffCompProperties_HediffExclusive">
      <hediffToNullify>
        <li>Antypheromone_SuicideHigh_Proty_Ready</li>
      </hediffToNullify>
      
      <hediffToApply>Antypheromone_SuicideHigh</hediffToApply>
      
      <bodyDef>Anty</bodyDef>
    </li>
  </comps>
  <stages>
    <li>
      <minSeverity>0</minSeverity>
      <becomeVisible>false</becomeVisible>
    </li>
  </stages>
  </HediffDef>
</Defs>\
`

describe('TypeInfo injection test against HediffDef with mohar', () => {
  test('BodyDef.corePart.def', () => {
    const root = parse(exampleXML)
    const $ = cheerio.load(root as any, { xmlMode: true })

    const defName = $('Defs > HediffDef > defName').get(0)
    expect(defName).toBeInstanceOf(Element)

    const map = TypeInfoLoader.load(data as RawTypeInfo[])
    const injector = new TypeInfoInjector(map)

    injector.inject(root)

    const injectable = $('Defs > HediffDef > comps > li').get(0) as unknown as TypedElement
    expect(injectable).toBeInstanceOf(TypedElement)
    expect(injectable.typeInfo.fullName).toBe('MoharHediffs.HeDiffCompProperties_HediffExclusive')
  })
})
