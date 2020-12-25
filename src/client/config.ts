import { Uri } from 'vscode'
import { isAbsolute, dirname, resolve } from 'path'
// import { absPath } from '../common/common'
import { ConfigDatum, LoadFolders } from '../common/config'
import { DocumentUri } from 'vscode-languageserver-textdocument'

function sanitizeString(input: string): string {
	// windows forbidden char 0~31
	// return [...input].filter(char => (31 <= char.charCodeAt(0) && char.charCodeAt(0) <= 126)).join('')
	return input.replace(String.fromCharCode(8234), '').trim()
}

function convertToUri(baseUri: Uri, filePath: string | undefined): DocumentUri | undefined {
	if (filePath) {
		const path = sanitizeString(filePath)
		if (isAbsolute(path)) {
			return Uri.file(path).toString()
		} else {
			const dir = dirname(baseUri.fsPath)
			const result = resolve(dir, path)
			return Uri.file(result).toString()
		}
	}
}

function convertToUris(baseUri: Uri, p: string[] | undefined): DocumentUri[] | undefined {
	if (p) {
		const result: string[] = []
		for (const path of p) {
			const parse = convertToUri(baseUri, path)
			if (parse)
				result.push(parse)
		}
		return result
	}
}

export function parseConfig(configLike: any, configFilePath: Uri): ConfigDatum {
	const folders: Record<string, LoadFolders> = {}
	if ('folders' in configLike && typeof configLike.folders === 'object') {
		for (const [version, object] of Object.entries<any>(configLike.folders)) {
			if (typeof object !== 'object')
				continue

			const About = convertToUri(configFilePath, object.About)
			if (About === undefined)
				continue
			const Assemblies = convertToUri(configFilePath, object.Assemblies)
			const Defs = convertToUri(configFilePath, object.Defs)
			const Textures = convertToUri(configFilePath, object.Textures)
			const Sounds = convertToUri(configFilePath, object.Sounds)
			const Patches = convertToUri(configFilePath, object.Patches)
			const Languages = convertToUri(configFilePath, object.Languages)
			const DefReferences = convertToUris(configFilePath, object.DefReferences)
			const AssemblyReferences = convertToUris(configFilePath, object.AssemblyReferences)

			const loadFolders: LoadFolders = {
				version, About, Assemblies, Languages,
				Defs, Textures, Sounds, Patches, DefReferences, AssemblyReferences
			}

			folders[version] = loadFolders
		}
	}

	return {
		folders: folders
	}
}