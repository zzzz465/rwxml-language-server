import { NotificationType, RequestType } from 'vscode-languageclient'
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
  version: string
}

export interface XMLDocumentDependencyResponse {
  items: { readonly: true } & ProjectFileAddedNotificationParams
}

export interface WorkspaceInitializationNotificationParams {
  files: ProjectFileAddedNotificationParams[]
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
