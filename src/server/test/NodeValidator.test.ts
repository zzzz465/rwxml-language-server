/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { NodeValidator } from '../features/NodeValidator'
import { TextDocument } from 'vscode-languageserver'
import { parse } from '../parser/XMLParser'
import { TypeInfoMap } from '../RW/TypeInfo'
import { BFS2 } from './utils'

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

const textDoc = TextDocument.create('', '', 1, mockData)
const xmlDoc = parse(mockData)
const nodeValidator = new NodeValidator(new TypeInfoMap([]), textDoc, xmlDoc, [])

test('getRange test', function () {
	const node = BFS2(xmlDoc.root!, 'ThingDef')!
	expect(node.start).toBe(47)
	expect(node.startTagEnd).toBe(79)

	const startTagRange = nodeValidator.getRange(node.start, node.startTagEnd!)
	expect(startTagRange.start.line).toBe(2)
	expect(startTagRange.start.character).toBe(0)
	expect(startTagRange.end.line).toBe(2)
	expect(startTagRange.end.character).toBe(32)
})

test('getRangeIncludingTag test', function () {
	const node = BFS2(xmlDoc.root!, 'ThingDef')!
	expect(node.start).toBe(47)
	expect(node.end).toBe(633)

	const { start, end } = nodeValidator.getRangeIncludingTag(node)
	expect(start.line).toBe(2)
	expect(start.character).toBe(0)
	expect(end.line).toBe(14)
})

describe('getTextRange test', function () {
	test('test on defName', function () {
		const node = BFS2(xmlDoc.root!, 'defName')!
		const { start, end } = nodeValidator.getTextRange(node)!
		expect(start.line).toBe(3)
		expect(start.character).toBe(9)
		expect(end.line).toBe(3)
		expect(end.character).toBe(13)
	})
})