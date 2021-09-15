import { Element, Injectable, Node, Text } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import _ from 'lodash'
import { Range } from '@rwxml/analyzer'
import { MultiDictionary } from 'typescript-collections'
import { CompletionItem, CompletionItemKind, TextEdit } from 'vscode-languageserver'
import { getMatchingText } from '../../data-structures/trie-ext'
import { Project } from '../../project'

export class OpenTagCompletion {
  private defs: MultiDictionary<string, string> = new MultiDictionary()

  complete(project: Project, node: Node, offset: number): CompletionItem[] {
    // <>... 의 경우, node 는 Text
    // <a ... 의 경우, node 는 Element
    if (!(node instanceof Text) && !(node instanceof Element)) {
      return []
    }

    const isPointingTagName =
      (node instanceof Element && node.openTagNameRange.include(offset)) || // <ta... ?
      (node instanceof Text && node.nodeRange.include(offset) && node.document.getCharAt(offset - 1) === '<') // <... ?

    if (!isPointingTagName) {
      return []
    }

    const range = new Range()
    if (node instanceof Element) {
      range.copyFrom(node.openTagNameRange)
    } else if (node instanceof Text) {
      range.start = offset
      range.end = offset
    }

    const textEditRange = project.rangeConverter.toLanguageServerRange(range, node.document.uri)
    if (!textEditRange) {
      return []
    }

    const nodeName = node instanceof Element ? node.name : '' // node name is '' when type is Text
    const parentNode = node.parent instanceof Element ? node.parent : undefined
    const parentTagName = node.parent instanceof Element ? node.parent.name : undefined
    if (!parentTagName || !parentNode) {
      return []
    }

    if (parentNode.name === 'Defs') {
      // completes defType
      const tags = this.getDefNames(project)
      const completions = getMatchingText(tags, nodeName)

      return completions.map(
        (label) =>
          ({
            label,
            kind: CompletionItemKind.Field,
            textEdit: nodeName.length > 0 ? TextEdit.replace(textEditRange, label) : undefined,
          } as CompletionItem)
      )
    } else if (parentNode instanceof Injectable) {
      if (parentNode.typeInfo.isEnumerable()) {
        return [
          {
            label: 'li',
            kind: CompletionItemKind.Field,
            textEdit: nodeName.length > 0 ? TextEdit.replace(textEditRange, 'li') : undefined,
          },
        ]
      } else {
        const childNodes = AsEnumerable(parentNode.ChildElementNodes)
          .Where((e) => e instanceof Injectable)
          .Select((e) => e.name)
          .ToArray()
        const candidates = _.difference(Object.keys(parentNode.typeInfo.fields), childNodes)
        const completions = getMatchingText(candidates, nodeName)

        return completions.map(
          (label) =>
            ({
              label,
              kind: CompletionItemKind.Field,
              textEdit: nodeName.length > 0 ? TextEdit.replace(textEditRange, label) : undefined,
            } as CompletionItem)
        )
      }
    } else {
      return []
    }
  }

  private getDefNames(project: Project) {
    let cached = this.defs.getValue(project.version)

    if (cached.length === 0) {
      const values = AsEnumerable(project.defManager.typeInfoMap.getAllNodes())
        .Where((t) => !!t.getDefType())
        .Select((t) => t.getDefType() as string)
        .ToArray()

      for (const value of values) {
        this.defs.setValue(project.version, value)
      }

      cached = this.defs.getValue(project.version)
    }

    return cached
  }
}
