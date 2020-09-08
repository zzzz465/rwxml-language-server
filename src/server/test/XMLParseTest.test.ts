/* eslint-disable @typescript-eslint/no-non-null-assertion */
import '../parser/XMLParser';
import { parse, Node } from '../parser/XMLParser';
import { BFS } from './utils';

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
		expect(parser.root!.tag).toBe('Defs')
	})
	
});

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
    expect(root.tag).toBe('Defs')
  })
  test('incomplete node should have ThingDef as parent', function () {
    const incompleteNode = BFS(root, (node) => !node.closed)
    const parent = BFS(root, (node) => node.tag === 'ThingDef')
    expect(incompleteNode).not.toBeNull()
    expect(incompleteNode?.parent === parent).toBeTruthy()
  })
})
