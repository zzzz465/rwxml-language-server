export function cache(): MethodDecorator {
  return function (target, propertyKey, descriptor: PropertyDescriptor) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const original = (<unknown>descriptor.value) as Function
    let cached = false
    let value: any = undefined

    descriptor.value = function (...args: any[]) {
      if (!cached) {
        value = original.apply(this, args)
        cached = true
      }

      return value
    }
  }
}
