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

export const enum fileKind {
	about,
	def,
	texture,
	referencedDef
}

function isSubFile(parent: URILike, child: URILike): boolean {
	return child.startsWith(parent)
}

export function getVersion(config: ConfigDatum, uri: URILike): { kind: fileKind, version: string } | undefined {
	let result: { kind: fileKind, version: string } | undefined = undefined

	for (const [version, object] of Object.entries(config.folders)) {
		if (object.Defs) {
			if (isSubFile(object.Defs, uri))
				result = { kind: fileKind.def, version }
		} else if (object.Textures) {
			if (isSubFile(object.Textures, uri))
				result = { kind: fileKind.texture, version }
		} else if (object.DefReferences) {
			for (const path of object.DefReferences) {
				if (isSubFile(path, uri)) {
					result = { kind: fileKind.referencedDef, version }
					break
				}
			}
		}

		if (result)
			break
	}

	return result
}