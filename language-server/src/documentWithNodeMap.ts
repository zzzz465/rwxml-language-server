import * as analyzer from '@rwxml/analyzer'
import { Document } from '@rwxml/analyzer'

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
}

export function create(document: Document): DocumentWithNodeMap {
  const map = new Map()
  return Object.create(document, {
    nodeMap: {
      get: () => map,
    },
  })
}
