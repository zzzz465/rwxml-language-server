import { Element } from '@rwxml/analyzer'
import { find } from 'ramda'
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
  (el: Element | undefined) => Result.checkNil<Element>(el)
)
