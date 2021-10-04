import { Connection } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import { DependencyRequest } from './events'
import { injectable, container } from 'tsyringe'
import { RimWorldVersion } from './typeInfoMapManager'
import { Dependency } from './mod'
import { ConnectionWrapper } from './connection'

export interface RequestDependencyParams {
  version: RimWorldVersion
  dependencies: Dependency[]
  dlls: URI[]
}

@injectable()
export class DependencyRequester {
  private readonly connection = container.resolve<Connection>('connection')

  async requestDependencies({ dependencies, dlls, version }: RequestDependencyParams) {
    const pkgIds = dependencies.map((dep) => dep.packageId)
    const dllUris = dlls.map((uri) => uri.toString())

    await this.waitConnectionTobeReady()

    const response = await this.connection.sendRequest(DependencyRequest, {
      version: version,
      packageIds: pkgIds,
      dlls: dllUris,
    })

    return response
  }

  private async waitConnectionTobeReady() {
    await container.resolve(ConnectionWrapper).waitInitialization()
  }
}
