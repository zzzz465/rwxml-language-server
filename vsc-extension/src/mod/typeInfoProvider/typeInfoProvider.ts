export const TypeInfoProviderSymbol = Symbol()

export interface TypeInfoProvider {
  get(version: string): Promise<any[]>
}

export class StaticTypeInfoProvider implements TypeInfoProvider {
  async get(version: string) {
    return []
  }
}
