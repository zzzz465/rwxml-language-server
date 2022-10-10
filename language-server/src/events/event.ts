import * as ls from 'vscode-languageserver'
import { UrlEncodedString } from '../types'
import { DocumentToken } from '../types/documentToken'

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

export interface TextRequest {
  uri: string
}

export interface TextRequestResponse {
  data: string
}

export interface TypeInfoRequest {
  version: string
  uris: string[]
}

export interface TypeInfoRequestResponse {
  data?: unknown[]
}

export interface DependencyRequest {
  packageId: string
  version: string
}

export interface DependencyRequestResponse {
  packageId: string
  version: string
  uris: string[]
}

export interface ResourceExistsRequest {
  uri: string
}

export interface ResourceExistsRequestResponse {
  uri: string
  exists: boolean
}

export interface DocumentTokenRequest {
  uri: string
}

export interface DocumentTokenRequestResponse {
  uri: string
  tokens: DocumentToken[]
}

/**
 * ParsedTypeInfoRequest requests full typeInfo data of the specific version to the server by client.
 */
export interface ParsedTypeInfoRequest {
  version: string
}

export interface ParsedTypeInfoRequestResponse {
  version: string
  data: any
}

/**
 * DefListRequest requests all defs of the specific version.
 */
export interface DefListRequest {
  version: string
}

export interface DefListRequestResponse {
  version: string
  data: any
}

export const ProjectFileAdded = new ls.NotificationType<ProjectFileAddedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileAdded'
)

export const ProjectFileChanged = new ls.NotificationType<ProjectFileChangedNotificationParams>(
  'rwxml-languge-server:notification:ProjectFileChanged'
)

export const ProjectFileDeleted = new ls.NotificationType<ProjectFileDeletedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileChanged'
)

export const SerializedXMLDocumentRequest = new ls.RequestType<
  SerializedXMLDocumentRequest,
  SerializedXMLDocumentResponse,
  undefined
>('rwxml-language-server:request:SerializedXMLDocument')

export const TextRequest = new ls.RequestType<TextRequest, TextRequestResponse, undefined>(
  'rwxml-language-server:request:TextRequest'
)

export const TypeInfoRequest = new ls.RequestType<TypeInfoRequest, TypeInfoRequestResponse, undefined>(
  'rwxml-language-server:request:TypeInfoRequest'
)

export const DependencyRequest = new ls.RequestType<DependencyRequest, DependencyRequestResponse, undefined>(
  'rwxml-language-server:request:DependencyRequest'
)

export const ResourceExistsRequest = new ls.RequestType<
  ResourceExistsRequest,
  ResourceExistsRequestResponse,
  undefined
>('rwxml-language-server:request:ResourceExistsRequest')

export const DocumentTokenRequest = new ls.RequestType<DocumentTokenRequest, DocumentTokenRequestResponse, undefined>(
  'rwxml-language-server:request:DocumentTokenRequest'
)

export const ParsedTypeInfoRequest = new ls.RequestType<
  ParsedTypeInfoRequest,
  ParsedTypeInfoRequestResponse,
  undefined
>('rwxml-language-server:request:ParsedTypeInfoRequest')

export const DefListRequest = new ls.RequestType<DefListRequest, DefListRequestResponse, undefined>(
  'rwxml-language-server:DefListRequest'
)
