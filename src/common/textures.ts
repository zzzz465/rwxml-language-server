import { RequestType, NotificationType } from 'vscode-languageserver'
import { DocumentUri } from 'vscode-languageserver-textdocument'

export interface TextureChangedNotificationParams {
	version: string
	uris: DocumentUri[]
}

export interface TextureRemovedNotificationParams {
	version: string
	uris: DocumentUri[]
}

export const TextureChangedNotificaionType = new NotificationType<TextureChangedNotificationParams>('rwxml/Texture/added')
export const TextureRemovedNotificationType = new NotificationType<TextureRemovedNotificationParams>('rwxml/Texture/removed')