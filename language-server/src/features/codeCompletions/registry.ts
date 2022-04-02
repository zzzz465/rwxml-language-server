import * as tsyringe from 'tsyringe'
import { CompleteAttribute } from './attribute'
import { DefNameCompletion } from './defName'
import { Enum } from './enum'
import { OpenTagCompletion } from './opentag'
import { ResourcePath } from './resourcePath'
import { Type } from './type'

@tsyringe.registry([
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: DefNameCompletion,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: OpenTagCompletion,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: ResourcePath,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: CompleteAttribute,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: Type,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
  {
    token: CodeCompletionContributorRegistry.token,
    useClass: Enum,
    options: { lifecycle: tsyringe.Lifecycle.Singleton },
  },
])
export class CodeCompletionContributorRegistry {
  static readonly token = Symbol(CodeCompletionContributorRegistry.name)
}
