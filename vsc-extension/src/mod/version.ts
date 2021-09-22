export const RimWorldVersions = ['default', '1.0', '1.1', '1.2', '1.3'] as const

export type RimWorldVersion = typeof RimWorldVersions[number]

export function isRimWorldVersion(version: string): version is RimWorldVersion {
  return RimWorldVersions.includes(version as RimWorldVersion)
}
