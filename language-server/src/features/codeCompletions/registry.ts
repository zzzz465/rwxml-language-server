import * as tsyringe from 'tsyringe'
import { CompleteAttribute } from './attribute'
import { DefNameCompletion } from './defName'
import { OpenTagCompletion } from './opentag'
import { ResourcePath } from './resourcePath'

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
])
export class CodeCompletionContributorRegistry {
  static readonly token = Symbol(CodeCompletionContributorRegistry.name)
}
