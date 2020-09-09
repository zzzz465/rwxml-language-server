import { Node } from '../parser/XMLParser'

export function BFS (node: Node, matcher: (node: Node) => boolean): Node | null {
  const queue: Node[] = [node]
  while (queue.length > 0) {
    const curr = queue.pop()!
    if(matcher(curr))
      return curr
    else
      queue.push(...curr.children)
  }
  return null
}

export function BFS2 (node: Node, tag: string): Node | null {
	return BFS(node, (node) => node.tag?.content === tag)
}