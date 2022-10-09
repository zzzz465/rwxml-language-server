import { Attribute, Element, Node, TypeInfo } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import { injectable } from 'tsyringe'
import { MultiDictionary } from 'typescript-collections'
import { CompletionItem, CompletionItemKind, CompletionList, TextEdit } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { ModManager } from '../../mod/modManager'
import { Project } from '../../project'
import { RimWorldVersion } from '../../RimWorldVersion'
import { RangeConverter } from '../../utils/rangeConverter'
import { expandUntil, isAllowedCharForClass } from '../../utils/strings'
import { getTypeReferenceName } from '../utils/type'
import { CodeCompletionContributor } from './contributor'

const knownAttributeNames = ['Name', 'ParentName', 'Class', 'Abstract', 'Inherit', 'MayRequire']
const ClassValueRegex = [
  /StockGenerator_[\w]+/, // stockgenerator_XXX
  /CompProperties_[\w]+/, // CompProperties_XXX
  /IngestionOutcomeDoer_[\w]+/, // IngestionOutcomeDoer_XXX
  /ScenPart_[\w]+/, // ScenPart_XXX_XXX
  /AudioGrain_[\w]+/, // AudioGrain_XXX
  /ColorGenerator_[\w]+/, // ColorGenerator_XXX
  /PatchOperation_[\w]+/, // PatchOperation_XXX
  /HediffGiver_[\w]+/, // HediffGiver_XXX
  /ThinkNode_[\w]+/, // ThinkNode_XXX
  /JobGiver_[\w]+/, // JobGiver_XXX
  /PerceptComp_[\w]+/, // PerceptComp_XXX
]

@injectable()
export class CompleteAttribute implements CodeCompletionContributor {
  private readonly classValue: MultiDictionary<RimWorldVersion, string> = new MultiDictionary()

  constructor(private readonly rangeConverter: RangeConverter, private readonly modManager: ModManager) {}

  getCompletion(project: Project, node: Node, offset: number): CompletionList | null {
    if (!(node instanceof Element) || !node.openTagRange.include(offset)) {
      return null
    }

    const attribs = node.attribs
    const items: CompletionItem[] = []
    const currentAttribute = findCurrentAttribute(node, offset)
    const currentPointingText = expandUntil(
      node.document.rawText,
      offset,
      (c) => isAllowedCharForClass(c),
      (c) => isAllowedCharForClass(c)
    )
    const textRange = this.rangeConverter.toLanguageServerRange(currentPointingText.range, node.document.uri)

    if (!textRange) {
      return null
    }

    if (
      (currentAttribute && isPointingAttributeName(currentAttribute, offset)) ||
      (!currentAttribute && offset > 0 && node.document.getCharAt(offset - 1) === ' ')
    ) {
      // selecting attribute name, or selecting whitespace inside starting tag
      const attrNameCandidates = AsEnumerable(knownAttributeNames)
        .Where((name) => !attribs[name])
        .ToArray()
      const completions = getMatchingText(attrNameCandidates, currentPointingText.text)

      items.push(
        ...completions.map(
          (label) =>
            ({
              label,
              kind: CompletionItemKind.Enum,
              textEdit: label.length > 0 ? TextEdit.replace(textRange, `${label}=""`) : undefined,
            } as CompletionItem)
        )
      )
    } else if (currentAttribute && isPointingAttributeValue(currentAttribute, offset)) {
      // selecting attribute values
      switch (currentAttribute.name) {
        case 'ParentName': {
          const defs = project.defManager.nameDatabase.getDef(null, node.name)
          const candidates = AsEnumerable(defs)
            .Select((def) => def.getNameAttributeValue())
            .Where((value) => !!value)
            .Distinct() // why this is even needed? need investigation
            .ToArray() as string[]

          const completions = getMatchingText(candidates, currentPointingText.text)

          items.push(
            ...completions.map(
              (label) =>
                ({
                  label,
                  kind: CompletionItemKind.EnumMember,
                  textEdit: label.length > 0 ? TextEdit.replace(textRange, label) : undefined,
                } as CompletionItem)
            )
          )
          break
        }

        case 'Class': {
          const classValues = this.getClassValues(project)
          const completions = getMatchingText(classValues, currentPointingText.text)

          items.push(
            ...completions.map(
              (label) =>
                ({
                  label,
                  kind: CompletionItemKind.EnumMember,
                  textEdit: label.length > 0 ? TextEdit.replace(textRange, label) : undefined,
                } as CompletionItem)
            )
          )
          break
        }

        case 'MayRequire': {
          const packageIds = this.modManager.packageIds
          const completions = getMatchingText(packageIds, currentPointingText.text)

          items.push(
            ...completions.map(
              (label) =>
                ({
                  label,
                  kind: CompletionItemKind.EnumMember,
                  textEdit: label.length > 0 ? TextEdit.replace(textRange, label) : undefined,
                } as CompletionItem)
            )
          )
          break
        }

        case 'Abstract':
        case 'Inherit': {
          items.push({
            label: 'true',
            kind: CompletionItemKind.EnumMember,
            textEdit: TextEdit.replace(textRange, 'true'),
          })
          items.push({
            label: 'false',
            kind: CompletionItemKind.EnumMember,
            textEdit: TextEdit.replace(textRange, 'false'),
          })
          break
        }
      }
    }

    return { isIncomplete: false, items }
  }

  private getClassValues(project: Project): string[] {
    const cached = this.classValue.getValue(project.version)

    if (cached.length === 0) {
      const values = AsEnumerable(project.defManager.typeInfoMap.getAllNodes())
        .Where((t) => !!ClassValueRegex.find((reg) => reg.test(t.fullName)))
        .Select((t) => this.toClassValue(t))
        .ToArray()

      for (const value of values) {
        this.classValue.setValue(project.version, value)
      }
    }

    return cached
  }

  private toClassValue(typeInfo: TypeInfo): string {
    return getTypeReferenceName(typeInfo)
  }
}

function findCurrentAttribute(node: Element, offset: number): Attribute | undefined {
  return node.attributes.find((attr) => attr.nameRange.include(offset) || attr.valueRange.include(offset))
}

function isPointingAttributeName(attr: Attribute, offset: number): boolean {
  return attr.nameRange.include(offset)
}

function isPointingAttributeValue(attr: Attribute, offset: number): boolean {
  return attr.valueRange.include(offset)
}
