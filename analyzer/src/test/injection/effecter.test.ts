import { parse } from '../..'
import { TypedElement } from '../../rimworld-types'
import { getInjector } from './utils'
import cheerio from 'cheerio'

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

const exampleXML2 = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
	<!-- 레버액션 -->
	<SoundDef>
		<defName>PNRifleSound</defName>
		<eventNames />
		<context>MapOnly</context>
		<maxSimultaneous>1</maxSimultaneous>
		<subSounds>
			<li>
				<grains>
					<li Class="AudioGrain_Clip">
						<clipPath></clipPath>
					</li>
				</grains>
				<pitchRange>
					<min>0.9152174</min>
					<max>1.042391</max>
				</pitchRange>
			</li>
		</subSounds>
	</SoundDef>
</Defs>
`

describe('SoundDef TypeInfo injection test', () => {
  test('injector should inject specific type on li node on possible', () => {
    const root = parse(exampleXML)
    const injector = getInjector()

    injector.inject(root)

    const $ = cheerio.load(root, { xmlMode: true })

    const clipPathNode = $('clipPath').get(0) as unknown as TypedElement
    const li = $('grains > li').get(0) as unknown as TypedElement

    expect(li).toBeInstanceOf(TypedElement)

    const attrib = li.attribs['Class']
    expect(attrib).not.toBeUndefined()
    expect(attrib.name).toEqual('Class')
    expect(attrib.value).toEqual('AudioGrain_Clip')

    expect(clipPathNode).toBeInstanceOf(TypedElement)
    expect(clipPathNode.parent.typeInfo.className).toEqual('AudioGrain_Clip')
  })

  test('injector should inject speicifc Type on li node with empty value node', () => {
    const root = parse(exampleXML2)
    const injector = getInjector()

    injector.inject(root)

    const $ = cheerio.load(root, { xmlMode: true })

    const liNode = $('grains > li').get(0) as unknown as TypedElement
    const clipPathNode = $('grains > li > clipPath').get(0) as unknown as TypedElement

    expect(liNode).toBeInstanceOf(TypedElement)
    expect(liNode.attribs['Class']?.value).toEqual('AudioGrain_Clip')
    expect(liNode.typeInfo.className).toEqual('AudioGrain_Clip')

    expect(clipPathNode).toBeInstanceOf(TypedElement)
  })
})
