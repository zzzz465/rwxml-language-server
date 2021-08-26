function create2DArray<T>(width: number, height: number, initValue: T): T[][] {
  return Array.from(Array(width), () => Array.from(Array(height), () => initValue))
}
