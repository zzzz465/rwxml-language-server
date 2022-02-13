import { NotificationType, RequestType } from 'vscode-languageclient'
import { SerializedAbout } from '../mod'
import { RimWorldVersion } from '../mod/version'
import { DecoItem, UrlEncodedString } from '../types'

export interface ProjectFileAddedNotificationParams {
  uri: UrlEncodedString
}

export interface ProjectFileChangedNotificationParams {
  uri: UrlEncodedString
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

/**
 * @deprecated merge this to add/changed/delete event
 */
export interface DependencyRequest {
  version: RimWorldVersion
  packageIds: string[]
  /**
   * @todo should I specify dll uris in here?
   */
  dlls: string[]
}

/**
 * @deprecated merge this to add/changed/delete event
 */
export interface DependencyResponse {
  version: RimWorldVersion
  typeInfos: unknown[]
  items: {
    readonly: true
    packageId: string
    defs: { uri: UrlEncodedString; text?: string }[]
  }[]
}

/**
 * @deprecated merge this to add/changed/delete event
 */
export interface WorkspaceInitializationNotificationParams {
  files: ProjectFileAddedNotificationParams[]
}

/**
 * @deprecated merge this to add/changed/delete event
 */
export interface ModChangedNotificationParams {
  mods: {
    about: SerializedAbout
  }[]
}

export interface TextRequest {
  uri: string
}

export interface TextRequestResponse {
  data: string
  error?: string
}

export interface TypeInfoRequest {
  uris: string[]
}

export interface TypeInfoRequestResponse {
  data?: unknown[]
  error?: string
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

export const ModChangedNotificationParams = new NotificationType<ModChangedNotificationParams>(
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

export const DependencyRequest = new RequestType<DependencyRequest, DependencyResponse, undefined>(
  'rwxml-language-server:request:DependencyData'
)

export const TextRequest = new RequestType<TextRequest, TextRequestResponse, undefined>(
  'rwxml-language-server:request:TextRequest'
)
