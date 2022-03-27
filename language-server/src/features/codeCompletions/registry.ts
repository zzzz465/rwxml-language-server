import * as tsyringe from 'tsyringe'

@tsyringe.registry([])
export class CodeCompletionContributorRegistry {
  static readonly token = Symbol(CodeCompletionContributorRegistry.name)
}
