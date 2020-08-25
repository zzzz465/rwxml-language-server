import { CompletionItem } from 'vscode-languageserver'
import { TypeIdentifier, typeNode } from '../RW/TypeInfo'

type specialType = {
	tag?: string
	typeIdentifier?: string
	completion: CompletionItem
}

const specialTypesByName: Map<string, specialType> = new Map()
const specialTypesbyTypeIdentifier: Map<TypeIdentifier, specialType> = new Map()

export function GetSpecialType(node: typeNode): specialType | undefined {
	if (node.tag)
		if (specialTypesByName.has(node.tag))
			return specialTypesByName.get(node.tag)
	
	return specialTypesbyTypeIdentifier.get(node.typeInfo.typeIdentifier)
}