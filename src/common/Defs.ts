import { RequestType, NotificationType } from 'vscode-languageserver'
// import { absPath } from './common'
import { def } from './TypeInfo'
import { DocumentUri } from 'vscode-languageserver-textdocument'

export interface DefFilesChanged {
	/** version of the files */
	version: string
	/** uri - content of the xml file */
	files: {
		[uri: string]: string
	}
}

export interface DefFilesRemoved {
	version: string
	files: DocumentUri[] // list of uri
}

/** DefReferences 내의 paths 를 쿼리한 결과를 보냄, delete일수도 있고, add일수도 있음 -> 서버단에서 관리 */
// will be expanded later.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RefDefFilesChangedParams extends DefFilesChanged {

}

export const DefFileAddedNotificationType = new NotificationType<DefFilesChanged>('Defs/added')
export const DefFileChangedNotificationType = new NotificationType<DefFilesChanged>('Defs/changed')
export const DefFileRemovedNotificationType = new NotificationType<DefFilesRemoved>('Defs/remove')

export const ReferencedDefFileAddedNotificationType = new NotificationType<RefDefFilesChangedParams>('RefDefs/added')
/** temp */
export const DefRequestType = new RequestType<def[], DocumentUri, undefined>('Defs/request')