import { TypeInfo } from './typeInfo'

export function isDef(typeInfo: TypeInfo) {
  return typeInfo.fullName === 'Verse.Def'
}

export function isString(typeInfo: TypeInfo) {
  return typeInfo.fullName === 'System.String'
}

export function isInteger(typeInfo: TypeInfo) {
  switch (typeInfo.fullName) {
    case 'System.Int32':
    case 'System.Int16':
    case 'System.Int64':
      return true
  }

  return false
}

export function isBoolean(typeInfo: TypeInfo) {
  return typeInfo.fullName === 'System.Boolean'
}

export function isColor32(typeInfo: TypeInfo) {
  return typeInfo.fullName === 'UnityEngine.Color32'
}