import { Def, Document, Element } from '@rwxml/analyzer'
import ono from 'ono'
import { find, pipe } from 'ramda'
import { pipeWithResult, Result } from '../../utils/functional/result'
import { childElements, isDef } from './node'

export const defGeneratorPrefixes = ['Meat_', 'Building_', 'Corpse_', 'Techprint_'] as const

export function isGeneratedDef(defName: string): boolean {
  return defGeneratorPrefixes.some((prefix) => defName.startsWith(prefix))
}

export function getDefNameOfGeneratedDef(defName: string): string | null {
  for (const prefix of defGeneratorPrefixes) {
    if (defName.startsWith(prefix)) {
      return defName.replace(prefix, '')
    }
  }

  return null
}

export const getDefInDocument = pipeWithResult(
  childElements, //
  find<Element>(isDef),
  (el: Element | undefined) => Result.checkNil(el)
)

const res = getDefInDocument('')
if (res.ok()) {
  res.value
} else {
  res.value
}

/**
 * find root <Defs> node in document.
 */
export const Defs = (document: Document | null | undefined): Result<Def, Error> => {
  getDefInDocument(document)

  if (!document) {
    return Result.err(ono('document is undefined'))
  }

  const root = pipe(childElements, find(isDef))(document)
  if (!root) {
    return [null, ono('no Defs found in document')]
  }

  return [root, null]
}
