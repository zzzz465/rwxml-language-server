/**
 * Takes a sorted array and a function p. The array is sorted in such a way that all elements where p(x) is false
 * are located before all elements where p(x) is true.
 * @param p predicate function that returns true if the element's start Index is greater than the given index
 * @returns the least x for which p(x) is true or array.length if no element fullfills the given function.
 */
export function sortedFindFirst<T>(array: T[], p: (x: T) => boolean): number {
  let low = 0
  let high = array.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (p(array[mid])) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  if (low < array.length && p(array[low])) {
    return low
  } else {
    return low - 1
  }
}

export function binarySearch<T>(array: T[], key: T, comparator: (op1: T, op2: T) => number): number {
  let low = 0,
    high = array.length - 1

  while (low <= high) {
    const mid = ((low + high) / 2) | 0
    const comp = comparator(array[mid], key)
    if (comp < 0) {
      low = mid + 1
    } else if (comp > 0) {
      high = mid - 1
    } else {
      return mid
    }
  }
  return -(low + 1)
}
