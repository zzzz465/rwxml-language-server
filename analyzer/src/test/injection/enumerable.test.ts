import { parse } from "../../parser"
import { DefReference, DefReferenceType, TypedElement } from "../../rimworld-types"
import { injector_1_4 } from "../data/injector"

describe('enumerable type injection test', () => {
  const xml = `
  <?xml version="1.0" encoding="utf-8" ?>
  <Defs>
    <QuestScriptDef>
      <defName>OpportunitySite_DownedRefugee</defName>
      <root Class="QuestNode_Sequence">
        <nodes>
          <li Class="QuestNode_GetSitePartDefsByTagsAndFaction">
            <storeAs>sitePartDefs</storeAs>
            <storeFactionAs>siteFaction</storeFactionAs>
            <sitePartsTags>
              <li> <!-- 1 -->
                <tag>DownedRefugee</tag>
              </li>
              <li>
                <tag>DownedRefugeeQuestThreat</tag>
                <chance>$siteThreatChance</chance>
              </li>
            </sitePartsTags>
          </li>
        </nodes>
      </root>
    </QuestScriptDef>
  </Defs>
  `

  it('node should be treated as injectable if generic type is Enumerable', () => {
    const doc = parse(xml)
    injector_1_4.inject(doc)

    const rootNode = doc.findNodeAt(365)! as TypedElement
    expect(rootNode).toBeDefined()
    expect(rootNode).toBeInstanceOf(TypedElement)
    expect(rootNode.typeInfo.className.startsWith('SlateRef`1')).toBe(true) // `1 = one generic argument
    expect(rootNode.typeInfo.isEnumerable()).not.toBeTruthy()

    const liNode = doc.findNodeAt(394)! as TypedElement // 1 node
    expect(liNode).toBeDefined()
    expect(liNode).toBeInstanceOf(TypedElement)
    expect(liNode.typeInfo.className).toBe('QuestNode_GetSitePartDefsByTagsAndFaction+SitePartOption')
  })

  it('node should inject String as injectable type', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <ThingDef ParentName="DrugPillBase">
		<defName>Battlestimulation_jelly_thing</defName>
		<tradeTags>
			<li>Antyjelly</li>
		</tradeTags>
	</ThingDef>
</Defs>
`
    const doc = parse(xml)
    injector_1_4.inject(doc)

    const liNode = doc.findNodeAt(157)! as TypedElement
    expect(liNode).toBeDefined()
    expect(liNode).toBeInstanceOf(TypedElement)
    expect(liNode.typeInfo.className).toBe('String')
  })

  it('non-list or non-array, but IEnumerable type should not determined as ListStructured', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <FactionDef Abstract="True" Name="AT_PlayerFactionBase">
		<settlementTexturePath>Icon/ATP_Icon</settlementTexturePath>
		<colorSpectrum>
			<li>(1, 1, 1)</li>
		</colorSpectrum>
		<raidLootValueFromPointsCurve>
			<points>
				<li>(35,     15)</li>
				<li>(100,   120)</li>
				<li>(1000,  500)</li>
				<li>(2000,  800)</li>
				<li>(4000, 1000)</li>
			</points>
		</raidLootValueFromPointsCurve>
	</FactionDef>
</Defs>
`

    const doc = parse(xml)
    injector_1_4.inject(doc)

    const raidLootValueNode = doc.findNodeAt(235)! as TypedElement
    expect(raidLootValueNode).toBeDefined()
    expect(raidLootValueNode).toBeInstanceOf(TypedElement)
    expect(raidLootValueNode.typeInfo.isListStructured()).toBeFalsy()
  })

  it('List Type injection test', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <HediffDef>
    <defName>AT_LarvaLearningAid</defName>
    <stages>
      <li>
        <statOffsets>
          <GlobalLearningFactor>5</GlobalLearningFactor>
        </statOffsets>
      </li>
    </stages>
  </HediffDef>
</Defs>
`

    const doc = parse(xml)
    injector_1_4.inject(doc)

    const statOffsetsNode = doc.findNodeAt(140)! as TypedElement
    expect(statOffsetsNode).toBeDefined()
    expect(statOffsetsNode).toBeInstanceOf(TypedElement)

    const genType = statOffsetsNode.typeInfo.getEnumerableType()!
    expect(genType).toBeDefined()
    expect(genType.className).toBe('StatModifier')
    expect(genType.customLoader()).toBe(true)


    const globalLearningFactorNode = doc.findNodeAt(167)! as DefReference
    expect(globalLearningFactorNode).toBeDefined()
    expect(globalLearningFactorNode).toBeInstanceOf(DefReference)
    expect(globalLearningFactorNode.refType).toBe(DefReferenceType.RefWithCount)
  })

  test('nestd List test', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <MemeDef>
    <defName>Supremacist</defName>
    <requireOne>
      <li> <!-- 0 -->
        <li>Slavery_Acceptable</li> <!-- 1 -->
        <li>Slavery_Honorable</li>
      </li>
      <li> <!-- 2 -->
        <li>Execution_Required</li>
        <li>Execution_RespectedIfGuilty</li>
        <li>Execution_DontCare</li>
      </li>
    </requireOne>
  </MemeDef>
</Defs>
`

    const doc = parse(xml)
    injector_1_4.inject(doc)

    const li_0_Node = doc.findNodeAt(120)! as TypedElement
    expect(li_0_Node).toBeDefined()
    expect(li_0_Node).toBeInstanceOf(TypedElement)
    expect(li_0_Node.typeInfo.isEnumerable()).toBeTruthy()
    expect(li_0_Node.typeInfo.isListStructured()).toBeTruthy()
    expect(li_0_Node.typeInfo.isList()).toBeTruthy()
  })
})
