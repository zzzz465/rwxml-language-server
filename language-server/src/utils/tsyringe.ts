import * as tsyringe from 'tsyringe'
import { Class } from 'utility-types'

type RegistryType = Parameters<typeof tsyringe.registry>[0]

export function registrations<T>(
  token: tsyringe.InjectionToken,
  classes: Class<T>[],
  options?: tsyringe.RegistrationOptions
): RegistryType {
  return classes.map((cls) => ({
    token,
    useClass: cls,
    options,
  }))
}
