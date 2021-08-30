import { NotificationType, RequestType } from 'vscode-languageserver'
import { SerializedAbout } from '../mod'
import { RimWorldVersion } from '../typeInfoMapManager'
import { DecoItem, UrlEncodedString } from '../types'

export interface ProjectFileAddedNotificationParams {
  uri: UrlEncodedString
  text?: string
  readonly?: boolean
}

export interface ProjectFileChangedNotificationParams {
  uri: UrlEncodedString
  text?: string
  readonly?: boolean
}

export interface ProjectFileDeletedNotificationParams {
  uri: UrlEncodedString
}

export interface SerializedXMLDocumentRequest {
  uri: UrlEncodedString
}

export interface SerializedXMLDocumentResponse {
  document?: Record<string, unknown>
}

export interface XMLDocumentDecoItemRequest {
  uri: string
}

export interface XMLDocumentDecoItemResponse {
  uri: string
  items: DecoItem[]
}

export interface XMLDocumentDependencyRequest {
  version: RimWorldVersion
  packageIds: string[]
}

export interface XMLDocumentDependencyResponse {
  items: ({ readonly: true; packageId: string } & ProjectFileAddedNotificationParams)[]
}

export interface WorkspaceInitializationNotificationParams {
  files: ProjectFileAddedNotificationParams[]
}

export interface ModChangedNotificationParams {
  mods: {
    about: SerializedAbout
  }[]
}

export const ProjectFileAdded = new NotificationType<ProjectFileAddedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileAdded'
)

export const ProjectFileChanged = new NotificationType<ProjectFileChangedNotificationParams>(
  'rwxml-languge-server:notification:ProjectFileChanged'
)

export const ProjectFileDeleted = new NotificationType<ProjectFileDeletedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileChanged'
)

export const WorkspaceInitialization = new NotificationType<WorkspaceInitializationNotificationParams>(
  'rwxml-language-server:notification:WorkspaceInitialization'
)

export const ModChangedNotification = new NotificationType<ModChangedNotificationParams>(
  'rwxml-language-server:notification:ModChanged'
)

export const SerializedXMLDocumentRequest = new RequestType<
  SerializedXMLDocumentRequest,
  SerializedXMLDocumentResponse,
  undefined
>('rwxml-language-server:request:SerializedXMLDocument')

export const XMLDocumentDecoItemRequest = new RequestType<
  XMLDocumentDecoItemRequest,
  XMLDocumentDecoItemResponse,
  undefined
>('rwxml-language-server:request:XMLDocumentDecoItem')

export const XMLDocumentDependencyRequest = new RequestType<
  XMLDocumentDependencyRequest,
  XMLDocumentDependencyResponse,
  undefined
>('rwxml-language-server:request:XMLDocumentDependency')
