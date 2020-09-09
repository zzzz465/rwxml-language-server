import { DefTextDocument, isReferencedDef } from '../RW/DefTextDocuments';
import { XMLDocument } from '../parser/XMLParser';
import { BFS } from '../utils/nodes';
import { DecoItem, DecoType } from '../../common/decoration';
import { isTypeNode, typeNode, TypeInfo } from '../../common/TypeInfo';
import { isInteger, isFloat } from './textParser';
import { TextDocument } from 'vscode-languageserver';
import { Range } from 'vscode-languageserver-textdocument';

interface decoParams {
	doc: DefTextDocument
	xmlDoc: XMLDocument
}

function textIsEnum(typeInfo: TypeInfo, text: string): boolean {
	return typeInfo.leafNodeCompletions?.has(text) || false
}

export function decoration({ doc, xmlDoc }: decoParams): DecoItem[] {
	function textToRange(text: { start: number, end: number }): Range {
		return {
			start: doc.positionAt(text.start),
			end: doc.positionAt(text.end)
		}
	}
	const result: DecoItem[] = []
	if (!xmlDoc.root) return result

	const nodes = BFS(xmlDoc.root).filter(node => isTypeNode(node)) as typeNode[]
	for (const node of nodes) {
		const typeInfo = node.typeInfo
		const { specialType } = typeInfo
		if (specialType) {
			const { // enum can't be destroyed because it is a reserved word.
				color, float, floatRange, intRange, intVec3, integer, string
			} = specialType

			if (node.text) {
				const text = node.text.content
				const range = textToRange(node.text)
				if (integer) {
					if (isInteger(text))
						result.push({ range, type: DecoType.content_integer })
				} else if (float) {
					if (isFloat(text))
						result.push({ range, type: DecoType.content_float })
				} else if (specialType.enum) {
					if (textIsEnum(typeInfo, text))
						result.push({ range, type: DecoType.content_Enum })
				} else if (specialType.defType) {
					// if (text) {
						// let defNode = node
						// while ()
					// }
				}
			}
		}
	}

	return result
}