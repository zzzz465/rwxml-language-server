import { NotificationType, RequestType } from 'vscode-languageclient'
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

export interface DependencyRequest {
  packageId: string
}

export interface DependencyRequestResponse {
  packageId: string
  uris: string[]
  error?: string
}

export interface ResourceExistsRequest {
  uri: string
}

export interface ResourceExistsRequestResponse {
  uri: string
  exists: boolean
  error?: any
}

export interface DocumentTokenRequest {
  uri: string
}

export interface DocumentTokenRequestResponse {
  uri: string
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

export const XMLDocumentDecoItemRequest = new RequestType<
  XMLDocumentDecoItemRequest,
  XMLDocumentDecoItemResponse,
  undefined
>('rwxml-language-server:request:XMLDocumentDecoItem')

export const TextRequest = new RequestType<TextRequest, TextRequestResponse, undefined>(
  'rwxml-language-server:request:TextRequest'
)

export const TypeInfoRequest = new RequestType<TypeInfoRequest, TypeInfoRequestResponse, undefined>(
  'rwxml-language-server:request:TypeInfoRequest'
)

export const DependencyRequest = new RequestType<DependencyRequest, DependencyRequestResponse, undefined>(
  'rwxml-language-server:request:DependencyRequest'
)

export const ResourceExistsRequest = new RequestType<ResourceExistsRequest, ResourceExistsRequestResponse, undefined>(
  'rwxml-language-server:request:ResourceExistsRequest'
)

export const DocumentTokenRequest = new RequestType<DocumentTokenRequest, DocumentTokenRequestResponse, undefined>(
  'rwxml-language-server:request:DocumentTokenRequest'
)
