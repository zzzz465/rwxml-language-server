import normalize_path from 'normalize-path'
import path from 'path'

/**
 * normalize any path to unix path, and optimize relative paths
 */
export function normalizePath(path: string) {
  return normalize_path(path)
}

// determine child is inside parent
export function isSubFileOf(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child)
  return !relativePath.startsWith('..')
}
