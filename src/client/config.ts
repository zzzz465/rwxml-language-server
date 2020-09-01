import * as vscode from 'vscode'
import { Uri } from 'vscode'
import { relative } from 'path'
import * as path from 'path'
// import { absPath } from '../common/common'
import { NotificationType } from 'vscode-languageserver'
import { URILike, relativePath } from '../common/common'
import { ConfigDatum, LoadFolders } from '../common/config'

function resolveRelativeToUri (baseUri: Uri, relative: relativePath | undefined): URILike | undefined {
	if (relative) {
		const dir = path.dirname(baseUri.fsPath)
		const result = path.resolve(dir, relative)
		return Uri.file(result).toString()
	}
}

function resolveRelativeToUris (baseUri: Uri, p: string[] | undefined): URILike[] | undefined {
	if (p) {
		return p.map(p2 => resolveRelativeToUri(baseUri, p2)!)
	}
}

export function parseConfig(configLike: any, configFilePath: Uri): ConfigDatum {
	const folders: Record<string, LoadFolders> = {}
	if ('folders' in configLike && typeof configLike.folders === 'object') {
		for (const [version, object] of Object.entries<any>(configLike.folders)) {
			if (typeof object !== 'object')
				continue
			
			const About = resolveRelativeToUri(configFilePath, object.About)
			if (About === undefined)
				continue
			const Assemblies = resolveRelativeToUri(configFilePath, object.Assemblies)
			const Defs = resolveRelativeToUri(configFilePath, object.Defs)
			const Textures = resolveRelativeToUri(configFilePath, object.Textures)
			const Sounds = resolveRelativeToUri(configFilePath, object.Sounds)
			const Patches = resolveRelativeToUri(configFilePath, object.Patches)
			const Languages = resolveRelativeToUri(configFilePath, object.Languages)
			const DefReferences = resolveRelativeToUris(configFilePath, object.DefReferences)

			const loadFolders: LoadFolders = { version, About, Assemblies, Languages,
					Defs, Textures, Sounds, Patches, DefReferences }

			folders[version] = loadFolders
		}
	}

	return {
		folders: folders
	}
}