export type RimWorldVersion = typeof RimWorldVersionArray[number]

export const RimWorldVersionArray = ['1.0', '1.1', '1.2', '1.3', 'default'] as const

export const RimWorldVersionToken = Symbol('RimWorldVersionToken')
