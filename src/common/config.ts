// no vscode module allowed in here!!!!!!!
import { RequestType, NotificationType } from 'vscode-languageserver'
import { URILike, relativePath, absPath } from './common'
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
}

export interface Config {
	folders: {
		[version: string]: LoadFolders
	}
}

export const querySubFilesRequestType = new RequestType<URILike, URILike[], undefined>('temp2')
export const ConfigChangedNotificationType = new NotificationType<Config>('config/changed')