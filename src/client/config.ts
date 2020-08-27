import * as vscode from 'vscode'
import { Uri } from 'vscode'
import { relative } from 'path'
import * as path from 'path'
// import { absPath } from '../common/common'
import { NotificationType } from 'vscode-languageserver'
import { URILike, relativePath } from '../common/common'

export interface LoadFolders {
	readonly version: URILike
	readonly About: URILike
	readonly Assemblies?: URILike
	readonly Languages?: URILike
	readonly Defs?: URILike
	readonly Textures?: URILike
	readonly Sounds?: URILike
	readonly Patches?: URILike
}

export function isSubFile (folders: LoadFolders, path: URILike): boolean {
	for (const dir of getDirs(folders)) {
		if (dir !== undefined) {
			if (path.startsWith(dir)) // only works when two paths are absolute path
				return true
		}
	}
	return false
}

function getDirs (folders: LoadFolders) {
	return [folders.About, folders.Assemblies, folders.Languages, folders.Defs, folders.Textures, folders.Sounds, folders.Patches]
}

export interface Config {
	folders: {
		[version: string]: LoadFolders
	}
}

export function getLoadFolders (config: Config, path: URILike): LoadFolders | undefined {
	for (const [version, object] of Object.entries(config.folders))
		if (isSubFile(object, path))
			return object
}

function resolveRelativeToUri (baseUri: Uri, relative: relativePath): URILike {
	const result = path.resolve(baseUri.fsPath, relative)
	return Uri.file(result).toString()
}

export function parseConfig(configLike: any, configFilePath: Uri): Config {
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

			const loadFolders: LoadFolders = { version, About, Assemblies, Languages,
					Defs, Textures, Sounds, Patches }

			folders[version] = loadFolders
		}
	}

	return {
		folders: folders
	}
}

export const ConfigChangedNotificationType = new NotificationType<Config>('config/changed')