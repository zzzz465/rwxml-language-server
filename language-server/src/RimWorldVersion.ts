export type RimWorldVersion = typeof RimWorldVersionArray[number]

// this is probably enough for now.
export const RimWorldVersionArray = [
  '1.0',
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '1.6',
  '1.7',
  '1.8',
  '1.9',
  'default',
] as const

export const RimWorldVersionToken = Symbol('RimWorldVersionToken')
