export interface SerializedAbout {
  readonly name: string
  readonly author: string
  readonly packageId: string
  readonly supportedVersions: string[]
}

export class Mod {
  constructor(public readonly about: SerializedAbout) {}
}
