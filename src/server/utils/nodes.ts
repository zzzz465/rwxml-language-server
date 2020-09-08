
import { Node } from '../parser/XMLParser'

export function BFS(root: Node): Node[] {
	const marker: Set<Node> = new Set()
	marker.add(root)
	const queue: Node[] = [root]
	while (queue.length > 0) {
		const curr = queue.pop()!

		for (const child of curr.children) {
			if (!marker.has(child)) {
				marker.add(child)
				queue.push(child)
			}
		}
	}

	return [...marker.values()]
}