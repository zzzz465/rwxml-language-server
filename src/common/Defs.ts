import { RequestType, NotificationType } from 'vscode-languageserver';
// import { absPath } from './common'
import { def } from './TypeInfo';
import { URILike } from './common';
import { type } from 'os';

export interface DefFilesChanged {
	/** version of the files */
	version: string
	/** uri - content of the xml file */
	files: {
		[uri: string]: string
	}
}

/** DefReferences 내의 paths 를 쿼리한 결과를 보냄, delete일수도 있고, add일수도 있음 -> 서버단에서 관리 */
// will be expanded later.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RefDefFilesChangedParams extends DefFilesChanged {

}

export const DefFileAddedNotificationType = new NotificationType<DefFilesChanged>('Defs/added')
export const DefFileChangedNotificationType = new NotificationType<DefFilesChanged>('Defs/changed')
export const DefFileRemovedNotificationType = new NotificationType<URILike>('Defs/remove')

export const ReferencedDefFileAddedNotificationType = new NotificationType<RefDefFilesChangedParams>('RefDefs/added')
/** temp */
export const DefRequestType = new RequestType<def[], URILike, undefined>('Defs/request')