import * as rwxml from '@rwxml/analyzer'
import { Node, Text, TypedElement } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import path from 'path'
import { injectable } from 'tsyringe'
import { CompletionItem, CompletionItemKind, CompletionList, TextEdit } from 'vscode-languageserver'
import { Range } from 'vscode-languageserver-textdocument'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'
import { RangeConverter } from '../../utils/rangeConverter'
import { getTextureResourceNodeType, TextureResourceType } from '../utils'
import { isPointingContentOfNode } from '../utils/node'
import { CodeCompletionContributor } from './contributor'

/**
 * ResourcePath suggests resource path completion
 */
@injectable()
export class ResourcePath implements CodeCompletionContributor {
  constructor(private readonly rangeConverter: RangeConverter) {}

  getCompletion(project: Project, node: Node, offset: number): CompletionList | null {
    let tagNode: TypedElement
    let editRange: Range | null
    let text: string

    if (!isPointingContentOfNode(node, offset)) {
      return null
    }

    if (node instanceof Text && node.parent instanceof TypedElement) {
      tagNode = node.parent
      text = node.nodeValue
      editRange = this.rangeConverter.toLanguageServerRange(node.dataRange, node.document.uri)
    } else if (node instanceof TypedElement) {
      tagNode = node
      text = ''
      editRange = this.rangeConverter.toLanguageServerRange(new rwxml.Range(offset, offset), node.document.uri)
    } else {
      return null
    }

    if (!editRange) {
      return null
    }

    const liFieldtypeClassName = tagNode.parent.typeInfo.className
    if (liFieldtypeClassName === 'AudioGrain_Clip' || liFieldtypeClassName === 'AudioGrain_Folder') {
      return {
        isIncomplete: false,
        items: this.completeAudioPath(project, text, editRange, liFieldtypeClassName),
      }
    } else if (tagNode.name.toLowerCase().endsWith('path')) {
      return {
        isIncomplete: false,
        items: this.completeTexturePath(project, tagNode, text, editRange),
      }
    } else {
      return null
    }
  }

  private completeAudioPath(
    project: Project,
    text: string,
    editRange: Range,
    fieldTypeClassName: string
  ): CompletionItem[] {
    const possibleValues: string[] = []

    if (fieldTypeClassName === 'AudioGrain_Clip') {
      possibleValues.push(
        ...AsEnumerable(project.resourceStore.audios.values())
          .Select((p) => {
            const parsed = path.parse(p)
            return [parsed.dir, parsed.name].join('/')
          })
          .ToArray()
      )
    } else if (fieldTypeClassName === 'AudioGrain_Folder') {
      possibleValues.push(...project.resourceStore.audioDirectories.values())
    }

    const candidates = getMatchingText(possibleValues, text)

    return candidates.map(
      (label) =>
        ({
          label,
          kind: CompletionItemKind.File,
          textEdit: text.length > 0 ? TextEdit.replace(editRange, label) : undefined,
        } as CompletionItem)
    )
  }

  private completeTexturePath(project: Project, node: TypedElement, text: string, editRange: Range): CompletionItem[] {
    const nodeType = getTextureResourceNodeType(project, node)
    const possibleValues: string[] = []

    switch (nodeType) {
      case TextureResourceType.SingleFile:
        possibleValues.push(...project.resourceStore.textures.values())
        break
      case TextureResourceType.FileWithCompass:
        break
      case TextureResourceType.Directory:
        break
      case TextureResourceType.Unknown:
        break
    }

    const candidates = getMatchingText(possibleValues, text)

    return candidates.map((label) => ({
      label,
      kind: CompletionItemKind.File,
      textEdit: TextEdit.replace(editRange, label),
    }))
  }
}
