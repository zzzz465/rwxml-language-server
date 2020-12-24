import { CompletionItem } from 'vscode-languageserver'
import { TypeIdentifier, typeNode } from '../../common/TypeInfo'

type specialType = {
	tag?: string
	typeIdentifier?: string
	completion: CompletionItem
}

const specialTypesByName: Map<string, specialType> = new Map()
const specialTypesbyTypeIdentifier: Map<TypeIdentifier, specialType> = new Map()

export function GetSpecialType(node: typeNode): specialType | undefined {
	if (node.tag)
		if (specialTypesByName.has(node.tag.content))
			return specialTypesByName.get(node.tag.content)

	return specialTypesbyTypeIdentifier.get(node.typeInfo.typeIdentifier)
}