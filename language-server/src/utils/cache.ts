export function cache(): MethodDecorator {
  let cached = false
  let value: any = undefined

  return function (target, propertyKey, descriptor: PropertyDescriptor) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const original = (<unknown>descriptor.value) as Function

    descriptor.value = function (...args: any[]) {
      if (!cached) {
        value = original.apply(target, args)
        descriptor.value = function () {
          return value
        }
        cached = true
        return value
      } else {
        throw new Error(
          `exception on behaviour: value cached but function is not replaced, object: ${target}, property: ${String(
            propertyKey
          )}`
        )
      }
    }
  }
}
