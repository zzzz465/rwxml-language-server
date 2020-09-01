import { RequestType, NotificationType } from 'vscode-languageserver';
// import { absPath } from './common'
import { def } from '../server/RW/TypeInfo';
import { URILike } from './common';

export type DefsFolderChanged = {
	path: URILike,
	text: string
}

export const DefFileAddedNotificationType = new NotificationType<DefsFolderChanged>('Defs/added')
export const DefFileChangedNotificationType = new NotificationType<DefsFolderChanged>('Defs/changed')
export const DefFileRemovedNotificationType = new NotificationType<URILike>('Defs/remove')

export const ReferencedDefFileAddedNotificationType = new NotificationType<DefsFolderChanged>('RefDefs/added')
/** temp */
export const DefRequestType = new RequestType<def[], URILike, undefined>('Defs/request')