import * as vscode from 'vscode'
import { window, ThemeColor } from 'vscode'
const { createTextEditorDecorationType } = window
import { DecoItem, DecoType } from '../../common/decoration';
import { Range } from 'vscode-languageserver';

const content_enum_decos = createTextEditorDecorationType({
	color: new ThemeColor('symbolIcon.enumeratorForeground'),
	before: {
		contentText: 'enum',
		color: 'gray',
		fontWeight: '600',
		margin: '3px'
	}
})

const content_defName_decos = createTextEditorDecorationType({
	color: 'green'
})

export function applyDecos (activeEditor: vscode.TextEditor, items: DecoItem[]): void {
	const map = new Map<any, vscode.Range[]>()
	map.set(DecoType.content_Enum, [])
	map.set(DecoType.content_defName, [])
	map.set(DecoType.node_attrName, [])
	map.set(DecoType.node_attrValue, [])
	map.set(DecoType.node_tag, [])

	for (const item of items) {
		const start = new vscode.Position(item.range.start.line, item.range.start.character)
		const end = new vscode.Position(item.range.end.line, item.range.end.character)
		const range = new vscode.Range(start ,end)
		map.get(item.type)!.push(range)
	}
	const x = map.get(DecoType.content_Enum)
	activeEditor.setDecorations(content_enum_decos, map.get(DecoType.content_Enum)!)
}