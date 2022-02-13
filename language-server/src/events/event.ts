import { NotificationType, RequestType } from 'vscode-languageserver'
import { SerializedAbout } from '../mod'
import { RimWorldVersion } from '../typeInfoMapManager'
import { DecoItem, UrlEncodedString } from '../types'

import { Resource } from '../resource'

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

export interface DependencyRequest {
  version: RimWorldVersion
  packageIds: string[]
  dlls: string[]
}

export interface DependencyResponse {
  version: RimWorldVersion
  typeInfos: unknown[]
  items: {
    readonly: true
    packageId: string
    defs: { uri: UrlEncodedString; text?: string }[]
  }[]
}

export interface WorkspaceInitializationNotificationParams {
  files: ProjectFileAddedNotificationParams[]
}

export interface ModChangedNotificationParams {
  mods: {
    about: SerializedAbout
  }[]
}

export interface ResourceRequest {
  packageId: string
  version: string
  resourceUri?: string
}

export interface ResourceRequestResponse {
  packageId: string
  version: string
  resources: Resource[]
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

export const ResourceRequest = new RequestType<ResourceRequest, ResourceRequestResponse, undefined>(
  'rwxml-language-server:request:ResourceRequest'
)
