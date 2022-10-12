import { parse } from "../../parser"
import { Injectable } from "../../rimworld-types"
import { injector_1_4 } from "../data/injector"

describe('xml attrib related test', () => {
  it('should be able to inject typeInfo based on Class attrib', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThingSetMakerDef>
    <defName>Reward_ItemsStandard</defName>
    <root Class="ThingSetMaker_Sum">
      <resolveInOrder>true</resolveInOrder>
    </root>
  </ThingSetMakerDef>
</Defs>
`

    const doc = parse(xml)
    injector_1_4.inject(doc)

    const rootNode = doc.findNodeAt(119)! as Injectable
    expect(rootNode).toBeDefined()
    expect(rootNode).toBeInstanceOf(Injectable)
    expect(rootNode.typeInfo.className).toBe('ThingSetMaker_Sum')
    expect(rootNode.fieldInfo).toBeDefined()
    expect(rootNode.fieldInfo?.fieldType.className).toBe('ThingSetMaker_Sum')
  })
})
