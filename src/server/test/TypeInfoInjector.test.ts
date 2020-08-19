/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TypeInfoInjector, objToTypeInfos, typeNode, isTypeNode as isTypeNode, TypeInfoMap } from '../RW/TypeInfo'
import { parse } from '../parser/XMLParser'
import * as fs from 'fs'
import * as path from 'path'
// import * as mockTypeData from '../testData/output.json'
const mockDataPath = path.join(__dirname, '../testData/output.json')
const mockTypeData = JSON.parse(fs.readFileSync(mockDataPath, { encoding: 'utf-8' }))

const data = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>

<ThingDef ParentName="DrugBase">
  <defName>Beer</defName>
  <label>beer</label>
  <description>The first beverage besides water ever consumed by mankind. Beer can taste good, but its main effect is intoxication. Excessive consumption can lead to alcohol blackouts and, over time, addiction.</description>
  <descriptionHyperlinks>
	<HediffDef>AlcoholHigh</HediffDef>
	<HediffDef>AlcoholTolerance</HediffDef>
	<HediffDef>Hangover</HediffDef>
	<HediffDef>AlcoholAddiction</HediffDef>
	<HediffDef>Cirrhosis</HediffDef>
	<HediffDef>ChemicalDamageModerate</HediffDef>
  </descriptionHyperlinks>
  <graphicData>
	<texPath>Things/Item/Drug/Beer</texPath>
	<graphicClass>Graphic_StackCount</graphicClass>
  </graphicData>
  <equippedAngleOffset>-150</equippedAngleOffset>
  <rotatable>false</rotatable>
  <stackLimit>25</stackLimit>
  <statBases>
	<DeteriorationRate>0.5</DeteriorationRate>
	<MarketValue>12</MarketValue>
	<Mass>0.3</Mass>
	<Flammability>0.5</Flammability>
	<Nutrition>0.08</Nutrition>
  </statBases>
  <ingestible>
	<foodType>Fluid, Processed, Liquor</foodType>
	<joyKind>Chemical</joyKind>
	<joy>0.17</joy>
	<nurseable>true</nurseable>
	<drugCategory>Social</drugCategory>
	<ingestSound>Ingest_Beer</ingestSound>
	<ingestHoldOffsetStanding>
	  <northDefault>
		<offset>(0.18,0,0)</offset>
	  </northDefault>
	</ingestHoldOffsetStanding>
	<ingestCommandString>Drink {0}</ingestCommandString>
	<ingestReportString>Drinking {0}.</ingestReportString>
	<chairSearchRadius>25</chairSearchRadius>
	<outcomeDoers>
	  <li Class="IngestionOutcomeDoer_GiveHediff">
		<hediffDef>AlcoholHigh</hediffDef>
		<severity>0.15</severity>
		<toleranceChemical>Alcohol</toleranceChemical>
	  </li>
	  <li Class="IngestionOutcomeDoer_GiveHediff">
		<hediffDef>AlcoholTolerance</hediffDef>
		<severity>0.016</severity>
		<divideByBodySize>true</divideByBodySize>
	  </li>
	</outcomeDoers>
  </ingestible>
  <equipmentType>Primary</equipmentType>
  <techLevel>Neolithic</techLevel>
  <comps>
	<li Class="CompProperties_Drug">
	  <chemical>Alcohol</chemical>
	  <addictiveness>0.010</addictiveness>
	  <minToleranceToAddict>0.25</minToleranceToAddict>
	  <existingAddictionSeverityOffset>0.20</existingAddictionSeverityOffset>
	  <needLevelOffset>0.9</needLevelOffset>
	  <listOrder>10</listOrder>
	</li>
	<li>
	  <compClass>CompEquippable</compClass>
	</li>
  </comps>
  <tools>
	<li>
	  <label>bottle</label>
	  <capacities>
		<li>Blunt</li>
	  </capacities>
	  <power>9</power>
	  <cooldownTime>2</cooldownTime>
	</li>
	<li>
	  <label>neck</label>
	  <capacities>
		<li>Poke</li>
	  </capacities>
	  <power>9</power>
	  <cooldownTime>2</cooldownTime>
	</li>
  </tools>
	</ThingDef>
</Defs>
`;

describe('TypeInfo json to object converter test', function () {
	const converted = objToTypeInfos(mockTypeData)
	const ThingDefTypeInfo = converted.find(d => d.typeIdentifier === 'Verse.ThingDef')
	test('objToTypeInfo() converter test', () => {
		expect(ThingDefTypeInfo).toBeTruthy()
		expect(ThingDefTypeInfo?.childNodes).toBeTruthy()
		if (ThingDefTypeInfo?.childNodes) {
			const childNodes = ThingDefTypeInfo.childNodes
			expect(childNodes.get('thingClass')).toBe('System.Type')
			expect(childNodes.get('size')).toBe('Verse.IntVec2')
			expect(childNodes.get('useHitPoints')).toBe('System.Boolean')
		}
	})
})

test('TypeInfoInjector base injection test', function () {
	const parser = parse(data)
	expect(parser.root!.tag).toBe('Defs')
	const bodyDef = parser.root!.children[0]!
	expect(bodyDef.tag).toBe('ThingDef')
	const typeInfos = objToTypeInfos(mockTypeData)
	const injector = new TypeInfoInjector(new TypeInfoMap(typeInfos))
	injector.Inject(bodyDef)
	const injectedBodyDef = bodyDef as typeNode
	expect(isTypeNode(injectedBodyDef)).toBeTruthy()
	const ingestible = bodyDef.children.find(d => d.tag === 'ingestible')
	expect(ingestible).toBeTruthy()
	expect(isTypeNode(ingestible)).toBeTruthy()
	const ingestible_defNode = ingestible as typeNode
	expect(ingestible_defNode.typeInfo.childNodes).toBeTruthy()
	// const injector = new TypeInfoInjector();
})