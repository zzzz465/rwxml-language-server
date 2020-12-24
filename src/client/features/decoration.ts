import * as vscode from 'vscode'
import { window, ThemeColor } from 'vscode'
const { createTextEditorDecorationType } = window
import { DecoItem, DecoType } from '../../common/decoration'
import { Range } from 'vscode-languageserver'

const inlayHint = {
	background: new ThemeColor('rwxml.decorator.inlayHints.backgroundColor'),
	foreground: new ThemeColor('rwxml.decorator.inlayHints.foregroundColor')
}

const content_enum_decos = createTextEditorDecorationType({
	color: new ThemeColor('rwxml.decorator.content.enum.foregroundColor'),
	before: {
		contentText: 'enum: ',
		color: inlayHint.foreground,
		fontWeight: '600',
		backgroundColor: inlayHint.background
		// backgroundColor: new ThemeColor("rwxml.decorator.backgroundColor")
	}
})

const content_integer_decos = createTextEditorDecorationType({
	color: new ThemeColor('rwxml.decorator.content.integer.foregroundColor'),
	before: {
		contentText: 'int: ',
		color: inlayHint.foreground,
		fontWeight: '600',
		backgroundColor: inlayHint.background
	}
})

const content_float_decos = createTextEditorDecorationType({
	color: new ThemeColor('rwxml.decorator.content.float.foregroundColor'),
	before: {
		contentText: 'float: ',
		color: inlayHint.foreground,
		fontWeight: '600',
		backgroundColor: inlayHint.background
	}
})

const content_bool_decos = createTextEditorDecorationType({
	color: new ThemeColor('rwxml.decorator.content.boolean.foregroundColor'),
	before: {
		contentText: 'bool: ',
		color: inlayHint.foreground,
		fontWeight: '600',
		backgroundColor: inlayHint.background
	}
})

const node_tag_decos = createTextEditorDecorationType({
	color: new ThemeColor('rwxml.decorator.node.tag.foregroundColor')
})

const content_defName_decos = createTextEditorDecorationType({
	color: 'green'
})

const content_image_decos = createTextEditorDecorationType({
	before: {
		// contentIconPath: 
	}
})

const invalid_node_tag_decos = createTextEditorDecorationType({
	color: new ThemeColor("rwxml.decorator.invalid.node.tag.foregroundColor")
})

export function applyDecos(activeEditor: vscode.TextEditor, items: DecoItem[]): void {
	const map = new Map<any, vscode.Range[]>()
	map.set(DecoType.content_Enum, [])
	map.set(DecoType.content_boolean, [])
	map.set(DecoType.content_defName, [])
	map.set(DecoType.content_float, [])
	map.set(DecoType.content_image, [])
	map.set(DecoType.content_integer, [])
	map.set(DecoType.node_attrName, [])
	map.set(DecoType.node_attrValue, [])
	map.set(DecoType.node_tag, [])
	map.set(DecoType.invalid_node_tag, [])

	for (const item of items) {
		const start = new vscode.Position(item.range.start.line, item.range.start.character)
		const end = new vscode.Position(item.range.end.line, item.range.end.character)
		const range = new vscode.Range(start, end)
		map.get(item.type)!.push(range)
	}

	activeEditor.setDecorations(content_enum_decos, map.get(DecoType.content_Enum)!)
	activeEditor.setDecorations(content_integer_decos, map.get(DecoType.content_integer)!)
	activeEditor.setDecorations(content_float_decos, map.get(DecoType.content_float)!)
	activeEditor.setDecorations(content_defName_decos, map.get(DecoType.content_defName)!)
	activeEditor.setDecorations(content_image_decos, map.get(DecoType.content_image)!)
	activeEditor.setDecorations(content_bool_decos, map.get(DecoType.content_boolean)!)
	activeEditor.setDecorations(node_tag_decos, map.get(DecoType.node_tag)!)
	activeEditor.setDecorations(invalid_node_tag_decos, map.get(DecoType.invalid_node_tag)!)
	// activeEditor.setDecorations(content_integer_decos, map.get(DecoType.content_integer)!)
}