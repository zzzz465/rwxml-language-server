import stringify from 'fast-safe-stringify'

export default function json<T>(
  object: T,
  replacer?: (key: string, value: any) => any,
  space?: string | number,
  options?: { depthLimit: number | undefined; edgesLimit: number | undefined }
) {
  space = space ?? 2
  return stringify.stable(object, replacer, space, options)
}
