export const RimWorldVersions = ['v1.0', 'v1.1', 'v1.2', 'v1.3'] as const

export type RimWorldVersion = typeof RimWorldVersions[number]

export function isRimWorldVersion(version: string): version is RimWorldVersion {
  return RimWorldVersions.includes(version as RimWorldVersion)
}
