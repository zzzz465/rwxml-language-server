// TODO: fix this
const RimWorldVersionArray = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', 'default'] as const

export const RimWorldVersions = RimWorldVersionArray

export type RimWorldVersion = typeof RimWorldVersions[number]

export function isRimWorldVersion(version: string): version is RimWorldVersion {
  return RimWorldVersions.includes(version as RimWorldVersion)
}
