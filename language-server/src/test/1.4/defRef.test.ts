/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Def, DefDatabase, NameDatabase, parse, Text, TypedElement, TypeInfoLoader, TypeInfoMap } from '@rwxml/analyzer'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { DefManager } from '../../defManager'
import * as documentWithNodeMap from '../../documentWithNodeMap'
import { Definition } from '../../features/definition'
import typeInfo from './typeInfo.json'

describe('def reference test', () => {
  const typeMap: TypeInfoMap = TypeInfoLoader.load((typeInfo as any).rawData)

  beforeEach(() => {
    container.clearInstances()
  })

  it('it should pass', () => {
    return
  })

  it('should be able to reference a def', () => {
    const target = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <RulePackDef>
    <defName>NamerIdeoAstropolitan</defName>
    <include>
      <li>NamerIdeoGlobal</li>
      <li>CultureSpacer</li>
    </include>
  </RulePackDef>
</Defs>
`

    const ref = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <CultureDef>
    <defName>test_def_1</defName>
    <ideoNameMaker MayRequire="Ludeon.RimWorld.Ideology">NamerIdeoAstropolitan</ideoNameMaker>
  </CultureDef>
</Defs>
`

    const defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeMap, '1.4')
    const targetXML = documentWithNodeMap.create(parse(target, 'target.xml'))
    defManager.update(targetXML)
    expect(defManager.getDef('RulePackDef', 'NamerIdeoAstropolitan')).toHaveLength(1)
    const targetDef = defManager.getDef('RulePackDef', 'NamerIdeoAstropolitan')[0]

    const refXML = documentWithNodeMap.create(parse(ref, 'ref.xml'))
    defManager.update(refXML)
    expect(defManager.getDef('CultureDef', 'test_def_1')).toHaveLength(1)
    const refDef = defManager.getDef('CultureDef', 'test_def_1')[0]
    const ideoNameMakerNode = refDef.findNodeAt(154)!
    expect(ideoNameMakerNode).toBeDefined()

    // HACK
    const definition = new Definition(null as any)
    const location = definition.findDefinitions(defManager, ideoNameMakerNode.document, 154)
    expect(location).not.toBeNull()
    expect(location).toHaveLength(1)
  })

  describe('it should be able to resolve ref field added in 1.4', () => {
    const ref = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThingDef ParentName="BuildingBase" Name="AT_Wall">
    <defName>AT_Wall</defName>
    <terrainAffordanceNeeded>Heavy</terrainAffordanceNeeded> <!-- ref 1 -->
    <stuffCategories>
      <li>Metallic</li> <!-- 2 -- >
      <li>Stony</li>
    </stuffCategories>
    <comps>
      <li Class="CompProperties_MeditationFocus">
        <statDef>MeditationFocusStrength</statDef> <!-- ref 3 -->
        <focusTypes>
          <li>Minimal</li> <!-- ref 4 -->
        </focusTypes>
      </li>
      <li Class="CompProperties_ShipHeat" MayRequire="kentington.saveourship2">
        <compClass>CompShipHeat</compClass> <!-- ref 5 (Code) -->
      </li>
    </comps>
    <damageMultipliers>
      <li>
        <damageDef>Thump</damageDef> <!-- ref 6 -->
        <multiplier>0.5</multiplier>
      </li>
    </damageMultipliers>
  </ThingDef>
</Defs>
`

    const src = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <TerrainAffordanceDef>
    <defName>Heavy</defName> <!-- 1 -->
  </TerrainAffordanceDef>

  <StuffCategoryDef>
    <defName>Metallic</defName> <!-- 2 -->
  </StuffCategoryDef>

  <StatDef ParentName="MeditationFocusBase">
    <defName>MeditationFocusStrength</defName> <!-- 3 -->
  </StatDef>

  <StyleItemCategoryDef>
    <defName>Minimal</defName> <!-- 4 -->
  </StyleItemCategoryDef>

  <DamageDef> <!-- 6 -->
    <defName>Thump</defName>
  </DamageDef>
</Defs>
`

    const defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeMap, '1.4')
    const refXML = documentWithNodeMap.create(parse(ref, 'target.xml'))
    defManager.update(refXML)

    const srcXML = documentWithNodeMap.create(parse(src, 'src.xml'))
    defManager.update(srcXML)

    // HACK
    const definition = new Definition(null as any)

    it('injector should inject StuffCategoryDef', () => {
      const stuffCategoryDefNode = srcXML.findNodeAt(149)!
      expect(stuffCategoryDefNode).toBeDefined()
      expect(stuffCategoryDefNode).toBeInstanceOf(Def)
    })

    it('test search of "TerrainAffordanceDef"', () => {
      const metallicNode = refXML.findNodeAt(241)!
      expect(metallicNode).toBeDefined()
      expect(metallicNode).toBeInstanceOf(Text)
      expect(metallicNode?.parent).toBeInstanceOf(TypedElement)

      const defs = definition.findDefinitions(defManager, refXML, 241)
      expect(defs).toHaveLength(1)
    })

    it('test search of "StuffCategoryDef"', () => {
      // TODO
    })

    it('test search of "StatDef"', () => {
      // TODO
    })

    it('test search of "StyleItemCategoryDef"', () => {
      // TODO
    })

    it('test search of "DamageDef"', () => {
      // TODO
    })
  })
})
