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
