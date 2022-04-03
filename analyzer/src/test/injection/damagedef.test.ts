import { parse } from '../../parser'
import $ from 'cheerio'
import core from './anty.json'
import { TypeInfoLoader, RawTypeInfo, TypeInfoInjector } from '../..'
import { Def } from '../../rimworld-types'

$._options.xmlMode = true

const damageDef = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>

  <!-- Surgical cut: Makes it possible to remove inner organs without harming outer body parts -->
  <DamageDef ParentName="CutBase">
    <defName>SurgicalCut</defName>
    <label>surgical cut</label> 
    <workerClass>DamageWorker_AddInjury</workerClass>
    <deathMessage>{0} has died during surgery.</deathMessage> 
    <hediff>SurgicalCut</hediff> 
    <harmAllLayersUntilOutside>false</harmAllLayersUntilOutside>
    <hasForcefulImpact>false</hasForcefulImpact>
    <canInterruptJobs>false</canInterruptJobs>
    <impactSoundType />
    <armorCategory />
  </DamageDef>

  <!-- Execution cut: Makes it possible to distinguish execution damage from others -->
  <DamageDef ParentName="CutBase">
    <defName>ExecutionCut</defName>
    <label>execution cut</label>
    <workerClass>DamageWorker_AddInjury</workerClass>
    <execution>true</execution>
    <hediff>ExecutionCut</hediff>
    <hediffSkin>ExecutionCut</hediffSkin>
    <deathMessage>{0} has been executed by cutting.</deathMessage>
    <hasForcefulImpact>false</hasForcefulImpact>
    <canInterruptJobs>false</canInterruptJobs>
    <impactSoundType />
    <armorCategory />
  </DamageDef>

</Defs>
`

describe('API test', () => {
  test('getDefName() should return defName', () => {
    const root = parse(damageDef)

    const map = TypeInfoLoader.load(core as RawTypeInfo[])
    const injector = new TypeInfoInjector(map)

    injector.inject(root)

    const def = $(root).find('DamageDef').get(0) as unknown as Def
    expect(def).toBeInstanceOf(Def)
    expect(def.getDefName()).toBe('SurgicalCut')
  })
})
