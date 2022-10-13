import { parse } from "../../parser"
import { Injectable } from "../../rimworld-types"
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
              <li>
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

    const rootNode = doc.findNodeAt(365)! as Injectable
    expect(rootNode).toBeDefined()
    expect(rootNode).toBeInstanceOf(Injectable)
    expect(rootNode.typeInfo.className.startsWith('SlateRef`1')).toBe(true) // `1 = one generic argument
    expect(rootNode.typeInfo.isEnumerable()).toBeTruthy()

    const liNode = doc.findNodeAt(394)! as Injectable
    expect(liNode).toBeDefined()
    expect(liNode).toBeInstanceOf(Injectable)
    expect(liNode.typeInfo.className).toBe('QuestNode_GetSitePartDefsByTagsAndFaction+SitePartOption')
  })
})
