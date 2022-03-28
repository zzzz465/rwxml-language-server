import _ from 'lodash'

export function isInteger(text: string): boolean {
  const num = _.toNumber(text)
  if (isNaN(num)) {
    return false
  }

  return _.isInteger(num)
}

export function isFloat(text: string): boolean {
  const num = _.toNumber(text)
  if (isNaN(num)) {
    return false
  }

  return true
}
