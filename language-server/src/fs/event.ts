import { NotificationType } from 'vscode-languageserver'

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

export const ProjectFileAdded = new NotificationType<ProjectFileAddedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileAdded'
)

export const ProjectFileChanged = new NotificationType<ProjectFileChangedNotificationParams>(
  'rwxml-languge-server:notification:ProjectFileChanged'
)

export const ProjectFileDeleted = new NotificationType<ProjectFileDeletedNotificationParams>(
  'rwxml-language-server:notification:ProjectFileChanged'
)
