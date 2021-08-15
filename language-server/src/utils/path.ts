import normalize_path from 'normalize-path'
import { normalize } from 'path'

/**
 * normalize any path to unix path, and optimize relative paths
 */
export function normalizePath(path: string) {
  return normalize(normalize_path(path))
}
