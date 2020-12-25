/* eslint-disable @typescript-eslint/no-non-null-assertion */
import '../parser/XMLParser'
import { parse, Node } from '../parser/XMLParser'
import { BFS, BFS2 } from './utils'
import { TextDocument } from 'vscode-languageserver'
import { assert } from 'console'

const data = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <BodyDef>
    <defName>Bird</defName>
    <label>bird</label>
    <something>
      <asdf>12312321</wer>
      </asdf>
    </something>
    <corePart>
      <def>Body</def>
      <height>Middle</height>
	  <depth>Outside</depth>
      <parts>
        <li>
          <def>Tail</def>
          <coverage>0.10</coverage>
        </li>
        <li>
          <def>Leg</def>
          <customLabel>left leg</customLabel>
          <coverage>0.10</coverage>
          <height>Bottom</height>
          <parts>
            <li>
              <def>Foot</def>
              <customLabel>left foot</customLabel>
              <coverage>0.5</coverage>
              <groups>
                <li>Feet</li>
              </groups>
            </li>
          </parts>
        </li>
        <li>
          <def>Leg</def>
          <customLabel>right leg</customLabel>
          <coverage>0.10</coverage>
          <height>Bottom</height>
          <parts>
            <li>
              <def>Foot</def>
              <customLabel>right foot</customLabel>
              <coverage>0.5</coverage>
              <groups>
                <li>Feet</li>
              </groups>
            </li>
          </parts>
        </li>
      </parts>
    </corePart>
  </BodyDef>
</Defs>
`
describe('xml parse test', function () {
  const parser = parse(data)
  test('root tag should be Defs', () => {
    expect(parser.root!.tag?.content).toBe('Defs')
  })
})

const incompleteXML = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <ThingDef>
    <
  </ThingDef>
</Defs>
`

describe('incomplete xml parse test', function () {
  const parseResult = parse(incompleteXML)
  const root = parseResult.root!
  test('root tag should be \'Defs\'', function () {
    expect(root.tag?.content).toBe('Defs')
  })
  test('incomplete node should have ThingDef as parent', function () {
    const incompleteNode = BFS(root, (node) => !node.closed)
    const parent = BFS(root, (node) => node.tag?.content === 'ThingDef')
    expect(incompleteNode).not.toBeNull()
    expect(incompleteNode?.parent === parent).toBeTruthy()
  })
})


const mockData = ([ // note that on each line, \n character is appended at the end
  // 0
  '<?xml version="1.0" encoding="utf-8" ?>',
  // 40
  '<Defs>',
  // 47
  '<ThingDef ParentName="DrugBase">',
  // 79
  '<defName>Beer</defName>',
  // 99
  '<label>beer</label>',
  // 119
  '<description>The first beverage besides water ever consumed by mankind. Beer can taste good, but its main effect is intoxication. Excessive consumption can lead to alcohol blackouts and, over time, addiction.</description>',
  // 347
  '<descriptionHyperlinks>',
  // 371
  '<HediffDef>AlcoholHigh</HediffDef>',
  // 406
  '<HediffDef>AlcoholTolerance</HediffDef>',
  // 446
  '<HediffDef>Hangover</HediffDef>',
  // 478
  '<HediffDef>AlcoholAddiction</HediffDef>',
  // 518
  '<HediffDef>Cirrhosis</HediffDef>',
  // 551
  '<HediffDef>ChemicalDamageModerate</HediffDef>',
  // 597
  '</descriptionHyperlinks>',
  // 622
  '</ThingDef>',
  // 634
  '</Defs>'
]).join('\n')

describe('parser test 2', () => {
  const textDoc = TextDocument.create('', '', 1, mockData)
  const xmlDoc = parse(mockData)
  test('start tag test', () => {
    const node = BFS2(xmlDoc.root!, 'ThingDef')!
    expect(node).toBeTruthy()
    expect(node.tag).toBeTruthy()
    const { content, start, end } = node.tag!
    expect(start).toBe(48)
    expect(end).toBe(56)
    expect(content).toBe('ThingDef')
  })

  test('end tag test', () => {
    const node = BFS2(xmlDoc.root!, 'ThingDef')!
    expect(node).toBeTruthy()
    expect(node.endTag).toBeTruthy()
    const { start, content, end } = node.endTag!
    expect(start).toBe(624)
    expect(content).toBe('ThingDef')
    expect(end).toBe(632)
  })
})

false
true