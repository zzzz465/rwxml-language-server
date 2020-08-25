import { RequestType, NotificationType } from 'vscode-languageserver';
import { absPath } from './common'
import { def } from '../server/RW/TypeInfo';

export type DefsFolderChanged = {
	path: absPath,
	text: string
}

export const DefFileAddedNotificationType = new NotificationType<DefsFolderChanged>('Defs/added')
export const DefFileChangedNotificationType = new NotificationType<DefsFolderChanged>('Defs/changed')
export const DefFileRemovedNotificationType = new NotificationType<absPath>('Defs/remove')
export const DefRequestType = new RequestType<def[], absPath, undefined>('Defs/request')