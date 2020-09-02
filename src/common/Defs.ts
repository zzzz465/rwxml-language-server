import { RequestType, NotificationType } from 'vscode-languageserver';
// import { absPath } from './common'
import { def } from '../server/RW/TypeInfo';
import { URILike } from './common';
import { type } from 'os';

export type DefsFolderChanged = {
	path: URILike,
	text: string
}

/** DefReferences 내의 paths 를 쿼리한 결과를 보냄, delete일수도 있고, add일수도 있음 -> 서버단에서 관리 */
export type RefDefFilesChangedParams = {
	/** 림월드 어느 버전에 속해있는지(컨픽기준) 예) 1.1, 1.2 */
	version: string
	baseUri: URILike
	/** uri - content of the xml file */
	files: {
		[uri: string]: string
	}
}[]

export const DefFileAddedNotificationType = new NotificationType<DefsFolderChanged>('Defs/added')
export const DefFileChangedNotificationType = new NotificationType<DefsFolderChanged>('Defs/changed')
export const DefFileRemovedNotificationType = new NotificationType<URILike>('Defs/remove')

export const ReferencedDefFileAddedNotificationType = new NotificationType<RefDefFilesChangedParams>('RefDefs/added')
/** temp */
export const DefRequestType = new RequestType<def[], URILike, undefined>('Defs/request')