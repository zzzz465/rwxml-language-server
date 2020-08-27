/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { parse } from '../parser/XMLParser'
import { objToTypeInfos, TypeInfoInjector, TypeInfoMap, isTypeNode } from '../RW/TypeInfo'
import * as fs from 'fs'
import * as path from 'path'
import { BFS2 } from './utils'
import 'linq-es2015'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { NodeValidator } from '../features/NodeValidator'
import { builtInValidationParticipant } from '../features/BuiltInValidator'
// import * as mockTypeData from '../testData/output.json'
const mockDataPath = path.join(__dirname, '../testData/output.json')
const mockTypeData = JSON.parse(fs.readFileSync(mockDataPath, { encoding: 'utf-8' }))

const DefData = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>

  <ThingDef ParentName="ResourceBase">
    <defName>Chocolate</defName>
    <label>chocolate</label>
    <description>A delicious preparation of cocoa seeds ground together with sugar and vanilla. It fulfills the need for recreation, but it is not very nutritious.</description>
    <graphicData>
      <texPath>Things/Item/Resource/Chocolate</texPath>
      <graphicClass>Graphic_StackCount</graphicClass>
      <drawSize>0.88</drawSize>
    </graphicData>
    <soundInteract>Standard_Drop</soundInteract>
    <soundDrop>Standard_Drop</soundDrop>
    <socialPropernessMatters>true</socialPropernessMatters>
    <statBases>
      <MaxHitPoints>60</MaxHitPoints>
      <MarketValue>3</MarketValue>
      <Mass>0.075</Mass>
      <Flammability>1.0</Flammability>
      <DeteriorationRate>8</DeteriorationRate>
      <Nutrition>0.1</Nutrition>
    </statBases>
    <thingCategories>
      <li>Foods</li>
    </thingCategories>
    <ingestible>
      <preferability>DesperateOnly</preferability>
      <foodType>Processed</foodType>
      <joy>0.10</joy>d
      <joyKind>Gluttonous</joyKind>
      <maxNumToIngestAtOnce>4.5</maxNumToIngestAtOnce> <!-- this value should be an integer -->
      <ingestSound>Meal_Eat</ingestSound>
    </ingestible>
  </ThingDef>

</Defs>
`

describe('basic static type checking test', function () {
	const xmlDoc = parse(DefData)
	const typeInfos = objToTypeInfos(mockTypeData)
	const typeInfoMap = new TypeInfoMap(typeInfos)
	const injector = new TypeInfoInjector(typeInfoMap)
	const ThingDef = BFS2(xmlDoc.root!, 'ThingDef')!
  injector.Inject(ThingDef)
  test('injector should inject ThingDef type into the def object', () => {
    expect(isTypeNode(ThingDef)).toBe(true)
  })

	test('ThingDef/statBases/Mass should be checked as float', function () {
		const textDoc = TextDocument.create('', 'xml', 1, DefData)
		
		const ingestible = ThingDef.children.find(n => n.tag === 'ingestible')!
		expect(ingestible).toBeTruthy() // null check
		const maxNumToIngestAtOnce = ingestible.children.find(n => n.tag === 'maxNumToIngestAtOnce')!
		expect(maxNumToIngestAtOnce).toBeTruthy() // null check
		
		const validator = new NodeValidator(typeInfoMap, textDoc, xmlDoc, [builtInValidationParticipant])
		const result = validator.validateNode()
    
    const { start: textStart, end: textEnd } = maxNumToIngestAtOnce.text!

		const error = result.find(d => textDoc.offsetAt(d.range.start) >= textStart && textDoc.offsetAt(d.range.end) <= textEnd)
		expect(error).not.toBeUndefined()
	})
})