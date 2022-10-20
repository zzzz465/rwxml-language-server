/* eslint-disable @typescript-eslint/explicit-function-return-type */
import stringify from 'json-stringify-safe'
import _ from 'lodash'

// check https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html
// see section "IDL Definition"
const keys = [
  // root json have empty string as a key
  '',

  // Node
  'type',
  'nodeName',
  'nodeValue',
  'nodeType',
  'parentNode',
  'childNodes',
  'previousSibling',
  'nextSibling',

  // NodeWithChildren
  'firstChild',
  'lastChild',

  // ParentNode
  'children',
  'childElementCount', // required?

  // Element
  'tagName',
  'attributes',
]

// retain only DOM Level 1 stuffs
export const nodeSerializer = (log: boolean) => (key: string, value: any) => {
  if (log) {
    console.log(`key: ${key}, value: ${value}`)
  }

  if (typeof value === 'function') {
    return
  }

  const index = _.parseInt(key)

  if (!keys.includes(key) && _.isNaN(index)) {
    return
  }

  if (!_.isObjectLike(value)) {
    return value
  }

  if (_.isArray(value)) {
    const arr = [...value]
    replaceReference(new Set(), arr, value, arr)

    return arr
  } else if (typeof value === 'object' && value !== null) {
    const obj = _.toPlainObject(value)

    // process getters
    for (const key of keys) {
      if (key in value) {
        obj[key] = value[key]
      }
    }

    replaceReference(new Set(), obj, value, obj)

    return obj
  } else {
    return null
  }
}

/**
 * recursively updates all reference of oldObject to newObject
 */
function replaceReference(visited: Set<unknown | unknown[]>, visitTarget: any | any[], old: any, new0: any): void {
  if (visited.has(visitTarget)) {
    return
  } else {
    visited.add(visitTarget)
  }

  if (_.isArray(visitTarget)) {
    for (let i = 0; i < visitTarget.length; i++) {
      const replaced = visitTarget[i]

      if (visitTarget[i] === old) {
        visitTarget[i] = new0
      }

      replaceReference(visited, replaced, old, new0)
    }
  } else if (typeof visitTarget === 'object' && visitTarget !== null) {
    for (const [key, value] of Object.entries(visitTarget)) {
      const replaced = value
      if (value === old) {
        visitTarget[key] = new0
      }

      replaceReference(visited, replaced, old, new0)
    }
  }
}

const obj: any = {
  foo: 'bar',
  fooArr: [],
  ref: null,
}

const ref: any = {
  obj: obj,
}

obj.fooArr.push(ref)
obj.ref = ref

const result = stringify(obj, nodeSerializer(true), 2)
console.log(result)
