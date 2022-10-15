import { parse } from "../../parser"
import { TypedElement } from "../../rimworld-types"
import { injector_1_4 } from "../data/injector"

describe('xml attrib related test', () => {
  const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThingSetMakerDef>
    <defName>Reward_ItemsStandard</defName>
    <root Class="ThingSetMaker_Sum">
      <resolveInOrder>true</resolveInOrder>
        <options>
          <li>
            <maxMarketValue>5500</maxMarketValue>
            <thingSetMaker Class="ThingSetMaker_RandomOption">
              <fixedParams>
                <minSingleItemMarketValuePct>0.15</minSingleItemMarketValuePct> <!-- we don't want too cheap items -->
              </fixedParams>
              <options>
                <li>
                  <weight>4</weight>
                  <thingSetMaker Class="ThingSetMaker_MarketValue">
                    <fixedParams>
                      <qualityGenerator>Reward</qualityGenerator>
                      <allowNonStackableDuplicates>False</allowNonStackableDuplicates>
                      <filter>
                      <thingSetMakerTagsToAllow>
                        <li>RewardStandardHighFreq</li>
                      </thingSetMakerTagsToAllow>
                      </filter>
                    </fixedParams>
                  </thingSetMaker>
                </li>
              </options>
            </thingSetMaker>
          </li>
        </options>
    </root>
  </ThingSetMakerDef>
</Defs>
`

  it('should be able to inject typeInfo based on Class attrib', () => {
    const doc = parse(xml)
    injector_1_4.inject(doc)

    const rootNode = doc.findNodeAt(119)! as TypedElement
    expect(rootNode).toBeDefined()
    expect(rootNode).toBeInstanceOf(TypedElement)
    expect(rootNode.typeInfo.className).toBe('ThingSetMaker_Sum')
    expect(rootNode.fieldInfo).toBeDefined()

    const optionsNode = doc.findNodeAt(203)! as TypedElement
    expect(optionsNode).toBeDefined()
    expect(optionsNode).toBeInstanceOf(TypedElement)
    expect(optionsNode.typeInfo.isList).toBeTruthy()

    const optionLiNode = doc.findNodeAt(223)! as TypedElement
    expect(optionLiNode).toBeDefined()
    expect(optionLiNode).toBeInstanceOf(TypedElement)
    expect(optionLiNode.typeInfo.className).toBe('ThingSetMaker_Sum+Option')
  })
})
