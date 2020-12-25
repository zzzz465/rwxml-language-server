import { RequestType, NotificationType } from 'vscode-languageserver'
import { URILike } from './common'

export interface TextureChangedNotificationParams {
	version: string
	files: URILike[]
}

export interface TextureRemovedNotificationParams {
	version: string
	files: URILike[]
}

export const TextureChangedNotificaionType = new NotificationType<TextureChangedNotificationParams>('rwxml/Texture/added')
export const TextureRemovedNotificationType = new NotificationType<TextureRemovedNotificationParams>('rwxml/Texture/removed')