// no vscode module allowed in here!!!!!!!
import { RequestType } from 'vscode-languageserver'
import { absPath } from './common'

export interface LoadFolders {
	readonly version: string
	readonly About: absPath,
	readonly Assemblies?: absPath,
	readonly Languages?: absPath,
	readonly Defs?: absPath,
	readonly Textures?: absPath,
	readonly Sounds?: absPath,
	readonly Patches?: absPath
}

export const LoadFoldersRequestType = new RequestType<absPath, LoadFolders | undefined, undefined>('temp')
export const querySubFilesRequestType = new RequestType<absPath, absPath[], undefined>('temp2')