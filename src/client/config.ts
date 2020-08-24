import * as vscode from 'vscode'
import { Uri } from 'vscode'
import { relative } from 'path'
import * as path from 'path'
import { absPath } from '../common/common'

export class LoadFolders {
	constructor (
		readonly version: absPath,
		readonly About: absPath,
		readonly Assemblies?: absPath,
		readonly Languages?: absPath,
		readonly Defs?: absPath,
		readonly Textures?: absPath,
		readonly Sounds?: absPath,
		readonly Patches?: absPath
	) {

	}

	isSubFile (path: absPath): boolean {
		for (const dir of this.getDirs()) {
			if (dir !== undefined) {
				if (path.startsWith(dir)) // only works when two paths are absolute path
					return true
			}
		}

		return false
	}

	getDirs (): (absPath|undefined)[] {
		return [this.About, this.Assemblies, this.Languages, this.Defs, this.Textures, this.Sounds, this.Patches]
	}
}

export interface config {
	folders: {
		[version: string]: LoadFolders
	}
	getLoadFolders (path: absPath): LoadFolders | undefined
}

export function parseConfig(configLike: any, configFilePath: Uri): config {
	const getFolderUriPath = (p: string | undefined) => p ? path.resolve(path.dirname(configFilePath.fsPath), p) : undefined
	const folders: Record<string, LoadFolders> = {}
	if ('folders' in configLike && typeof configLike.folders === 'object') {
		for (const [version, object] of Object.entries<any>(configLike.folders)) {
			if (typeof object !== 'object')
				continue
			
			const AboutUri = getFolderUriPath(object.About)
			if (AboutUri === undefined)
				continue
			const AssembliesUri = getFolderUriPath(object.Assemblies)
			const DefsUri = getFolderUriPath(object.Defs)
			const TexturesUri = getFolderUriPath(object.Textures)
			const SoundsUri = getFolderUriPath(object.Sounds)
			const PatchesUri = getFolderUriPath(object.Patches)
			const LanguagesUri = getFolderUriPath(object.Languages)

			const loadFolders = new LoadFolders(version, AboutUri, AssembliesUri, LanguagesUri,
					DefsUri, TexturesUri, SoundsUri, PatchesUri)

			folders[version] = loadFolders
		}
	}

	return {
		folders: folders,
		getLoadFolders: function (this: config, path: absPath) {
			for (const [version, object] of Object.entries(this.folders))
				if (object.isSubFile(path))
					return object
		}
	}
}