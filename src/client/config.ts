import * as vscode from 'vscode'
import { Uri } from 'vscode'
import { relative } from 'path'
import * as path from 'path'
import { absPath } from '../common/common'
import { NotificationType } from 'vscode-languageserver'

export interface LoadFolders {
	readonly version: absPath,
	readonly About: absPath,
	readonly Assemblies?: absPath,
	readonly Languages?: absPath,
	readonly Defs?: absPath,
	readonly Textures?: absPath,
	readonly Sounds?: absPath,
	readonly Patches?: absPath
}

export function isSubFile (folders: LoadFolders, path: absPath): boolean {
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

export function getLoadFolders (config: Config, path: absPath): LoadFolders | undefined {
	for (const [version, object] of Object.entries(config.folders))
		if (isSubFile(object, path))
			return object
}

export function parseConfig(configLike: any, configFilePath: Uri): Config {
	const getFolderUriPath = (p: string | undefined) => p ? path.resolve(path.dirname(configFilePath.fsPath), p) : undefined
	const folders: Record<string, LoadFolders> = {}
	if ('folders' in configLike && typeof configLike.folders === 'object') {
		for (const [version, object] of Object.entries<any>(configLike.folders)) {
			if (typeof object !== 'object')
				continue
			
			const About = getFolderUriPath(object.About)
			if (About === undefined)
				continue
			const Assemblies = getFolderUriPath(object.Assemblies)
			const Defs = getFolderUriPath(object.Defs)
			const Textures = getFolderUriPath(object.Textures)
			const Sounds = getFolderUriPath(object.Sounds)
			const Patches = getFolderUriPath(object.Patches)
			const Languages = getFolderUriPath(object.Languages)

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