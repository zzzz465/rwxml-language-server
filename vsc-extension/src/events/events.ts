import { NotificationType, RequestType } from 'vscode-languageclient'

export interface ProjectFileAddedNotificationParams {
  uri: string
  text?: string
}

export interface ProjectFileChangedNotificationParams {
  uri: string
  text?: string
}

export interface ProjectFileDeletedNotificationParams {
  uri: string
}

export interface SerializedXMLDocumentRequest {
  uri: string
}

export interface SerializedXMLDocumentResponse {
  document?: Record<string, unknown>
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

export const SerializedXMLDocumentRequest = new RequestType<
  SerializedXMLDocumentRequest,
  SerializedXMLDocumentResponse,
  undefined
>('rwxml-language-server:request:SerializedXMLDocument')
