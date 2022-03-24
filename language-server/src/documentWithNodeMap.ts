import * as analyzer from '@rwxml/analyzer'
import { Def, Document, Injectable } from '@rwxml/analyzer'

type NodeType =
  | analyzer.Node
  | analyzer.DataNode
  | analyzer.Text
  | analyzer.Comment
  | analyzer.NodeWithChildren
  | analyzer.Document
  | analyzer.Element
  | analyzer.Injectable
  | analyzer.Def

/**
 * DocumentWithNodeMap extends Document with additional nodes map
 * to make access to specific node types faster.
 * nodes are injected in defManager.
 *
 * type list
 * - Def
 * - Injectable
 */
export interface DocumentWithNodeMap extends analyzer.Document {
  get nodeMap(): Map<string, NodeType[]>
  get defs(): analyzer.Def[]
  get injectables(): analyzer.Injectable[]
}

export function create(document: Document): DocumentWithNodeMap {
  const map = new Map()
  map.set(Def.name, [])
  map.set(Injectable.name, [])

  return Object.create(document, {
    nodeMap: {
      get: () => map,
    },
    defs: {
      get: () => map.get(Def.name),
    },
    injectables: {
      get: () => map.get(Injectable.name),
    },
  })
}
