import { parse } from "../.."
import 'prettydiff'

const exampleXML = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>

  <SoundDef>
  <defName>Interact_Drill</defName>
  <sustain>True</sustain>
  <context>MapOnly</context>
  <maxSimultaneous>1</maxSimultaneous>
  <priorityMode>PrioritizeNearest</priorityMode>
  <subSounds>
    <li>
      <muteWhenPaused>True</muteWhenPaused>
      <grains>
        <li Class="AudioGrain_Clip">
          <clipPath>Interact/Work/Drill/Drill_loop</clipPath>
        </li>
      </grains>
      <volumeRange>6~6</volumeRange>
      <pitchRange>0.93~1.07</pitchRange>
      <distRange>25~40</distRange>
      <sustainAttack>1.1</sustainAttack>
    </li>
  </subSounds>
  </SoundDef>

</Defs>
`

describe('XML toString() test', () => {
  test('toString() result must be parsable xml', () => {
    const root = parse(exampleXML)

    const soundDefs = root.findNode((node) => node.tagName === 'SoundDef')
    expect(soundDefs.length).toBe(1)

    const soundDef = soundDefs[0]

    const defNameNodes = soundDef.findNode((node) => node.tagName === 'defName')
    expect(defNameNodes.length).toBe(1)

    const defNameNode = defNameNodes[0]
    const defNameNodeIndex = soundDef.childNodes.indexOf(defNameNode)
    expect(defNameNodeIndex).toBeLessThan(soundDef.childNodes.length)

    const otherNodesToAdd = soundDef.childNodes.slice(defNameNodeIndex + 1)

    const node = soundDef.cloneNode()
    node.children = [defNameNode, ...otherNodesToAdd]

    const result = node.toString()

    console.log(result)
  })
})
