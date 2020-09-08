// no vscode module allowed in here!!!!!!!
import { RequestType, NotificationType } from 'vscode-languageserver'
import { URILike, relativePath, absPath } from './common'
import { DefFilesChanged } from './Defs'
// import { absPath } from './common'

export interface LoadFolders {
	readonly version: string
	readonly About: URILike
	readonly Assemblies?: URILike
	readonly Languages?: URILike
	readonly Defs?: URILike
	readonly Textures?: URILike
	readonly Sounds?: URILike
	readonly Patches?: URILike
	readonly DefReferences?: URILike[]
	readonly AssemblyReferences?: URILike[]
}

export interface ConfigDatum {
	folders: {
		[version: string]: LoadFolders
	}
}

/** any that can be parsed as typeInfo */
type typeInfoDatum = any[]

/** re-initialize everything when the config changes */
export interface ConfigChangedParams {
	configDatum: ConfigDatum
	/** data arguments for each version */
	data: {
		[version: string]: {
			/** array of typeinfo */
			rawTypeInfo: any
		}
	}
}

export const ConfigChangedRequestType = new RequestType<ConfigChangedParams, void, undefined>('config/changed')

export function getLoadFolders (config: ConfigDatum, path: URILike): LoadFolders | undefined {
	for (const [version, object] of Object.entries(config.folders))
		if (isSubFile(object, path))
			return object
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