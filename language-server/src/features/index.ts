export * from './providerRegistry'

import _ from 'lodash'
import { singleton } from 'tsyringe'
import * as lsp from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import winston from 'winston'
import defaultLogger, { withClass } from '../log'
import { LoadFolder } from '../mod/loadfolders'
import { ProjectManager } from '../projectManager'
import { RimWorldVersionArray } from '../RimWorldVersion'
import { CodeCompletion } from './codeCompletions'
import { Definition } from './definition'
import { PatchReference } from './patchReference'
import { Reference } from './reference'
import { Rename } from './rename'

/**
 * LanguageFeature receives all lsp request and dispatch to each features
 * @todo replace this to di container
 */
@singleton()
export class LanguageFeature {
  private readonly log = winston.createLogger({
    format: winston.format.combine(withClass(LanguageFeature)),
    transports: [defaultLogger()],
  })

  constructor(
    private readonly loadFolder: LoadFolder,
    private readonly projectManager: ProjectManager,
    private readonly definition: Definition,
    private readonly codeCompletion: CodeCompletion,
    private readonly reference: Reference,
    private readonly patchReference: PatchReference,
    private readonly rename: Rename
  ) {}

  listen(connection: lsp.Connection): void {
    connection.onDefinition(this.wrapExceptionStackTraces(this.onDefinition.bind(this)))
    connection.onCompletion(this.wrapExceptionStackTraces(this.onCompletion.bind(this)))
    connection.onReferences(this.wrapExceptionStackTraces(this.onReference.bind(this)))
    connection.onRenameRequest(this.wrapExceptionStackTraces(this.onRenameRequest.bind(this)))
  }

  private async onCompletion({ position, textDocument }: lsp.CompletionParams): Promise<lsp.CompletionList> {
    const uri = URI.parse(textDocument.uri)
    const versions = this.loadFolder.isBelongsTo(uri)
    const result: lsp.CompletionList = { isIncomplete: true, items: [] }

    for (const version of versions) {
      const project = this.projectManager.getProject(version)
      if (!project) {
        continue
      }

      const { isIncomplete, items } = this.codeCompletion.codeCompletion(project, uri, position)
      result.isIncomplete ||= isIncomplete
      result.items.push(...items)
    }

    return result
  }

  private async onDefinition({ position, textDocument }: lsp.DefinitionParams): Promise<lsp.LocationLink[]> {
    const uri = URI.parse(textDocument.uri)
    const versions = this.loadFolder.isBelongsTo(uri)
    const result: lsp.LocationLink[] = []

    for (const version of versions) {
      const project = this.projectManager.getProject(version)
      if (!project) {
        continue
      }

      const { definitionLinks, errors } = this.definition.onDefinition(project, uri, position)

      this.handleError(errors)
      result.push(...definitionLinks)
    }

    return result
  }

  private async onReference({ position, textDocument }: lsp.ReferenceParams): Promise<lsp.Location[]> {
    const uri = URI.parse(textDocument.uri)
    const result: lsp.Location[] = []

    for (const version of RimWorldVersionArray) {
      const project = this.projectManager.getProject(version)
      if (!project) {
        continue
      }

      const res = this.reference.onReference(project, uri, position)
      result.push(...res)

      const res2 = await this.patchReference.getReference(project, uri.toString(), position)
      result.push(...res2)
    }

    return result
  }

  private async onRenameRequest({ textDocument, newName, position }: lsp.RenameParams): Promise<lsp.WorkspaceEdit> {
    const uri = URI.parse(textDocument.uri)

    const edit: lsp.WorkspaceEdit = { changes: {} }

    for (const version of RimWorldVersionArray) {
      const project = this.projectManager.getProject(version)
      if (!project) {
        continue
      }

      const res = this.rename.rename(project, uri, newName, position)
      edit.changes = _.merge(edit.changes, res)
    }

    return edit
  }

  private handleError(errors: any[], message?: string): void {
    if (errors.length > 0) {
      if (message) {
        this.log.error(message)
      }
      this.log.error(errors)
    }
  }

  /**
   * a wrapper for lsp request. prints stacktrace if error exists.
   */
  private wrapExceptionStackTraces<P, R>(func: (arg: P) => Promise<R>): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        this.log.error(e)
        throw e
      }
    }
  }
}
