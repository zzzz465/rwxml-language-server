import fp from 'fp-ts'
import { sequenceT } from 'fp-ts/lib/Apply'
import ono from 'ono'
import R, { juxt } from 'ramda'
import * as tsyringe from 'tsyringe'
import { URI } from 'vscode-uri'
import * as winston from 'winston'
import { LoadFolder } from '../../mod/loadfolders'
import { Project } from '../../project'
import { ProjectManager } from '../../projectManager'
import { Result } from '../../utils/functional/result'
import jsonStr from '../../utils/json'
import { getDefsNode } from './node'

/**
 * ProjectHelper is a utility class that helps finding projects and versions for a given URI
 */
@tsyringe.injectable()
export class ProjectHelper {
  constructor(protected readonly loadFolder: LoadFolder, protected readonly projectManager: ProjectManager) {}

  getProjects(uri: string | URI) {
    const versions = this.getVersions(uri)

    return versions.map((ver) => this.projectManager.getProject(ver))
  }

  getVersions(uri: string | URI) {
    if (typeof uri === 'string') {
      uri = URI.parse(uri)
    }

    const versions = this.loadFolder.isBelongsTo(uri)

    return versions
  }

  wrapExceptionStackTraces<P, R>(
    func: (arg: P) => Promise<R> | R,
    log?: winston.Logger
  ): (arg: P) => Promise<R | undefined> {
    return async (arg: P) => {
      try {
        return await func(arg)
      } catch (e: unknown) {
        log?.error(jsonStr(e))
      }
    }
  }
}

/*
// purpose

getDocument :: (proj, uri) -> Result<Document, ErrorLike>

getRoot :: (doc) -> Result<Element, ErrorLike>

juxt([getDocument, getRoot]) :: (proj, uri) => (Result<document, ErrorLike>, Result<element, ErrorLike>)

mergeResult :: (args: [Result<A, ErrorLike>, Result<B, ErrorLike>, Result<C, ErrorLike>, ..., Result<Z, ErrorLike>]) -> Result<[A, B, C, ..., Z], ErrorLike>

getResources :: (proj, uri) -> Result<[document, uri], ErrorLike>
*/

const _getDocument = (project: Project, uri: URI) => project.getXMLDocumentByUri(uri)
export const getDocument = (project: Project, uri: URI) =>
  fp.function.pipe(
    _getDocument(project, uri), //
    Result.fromNullable(ono(`cannot find document of uri ${uri}`))
  )

export const getRootInProject = fp.function.flow(getDocument, fp.either.chain(getDefsNode))

export const concat = <A, B>(a: Result<A>, b: Result<B>) => [a, b]

export const getDocumentAndRoot = R.curry((project: Project, uri: URI) =>
  sequenceT(fp.either.Apply)(...juxt([getDocument, getRootInProject])(project, uri))
)

// const res2 = sequenceT(fp.either.Apply)
// const res2 = sequenceT(fp.either.getApplicativeValidation())(...res)
