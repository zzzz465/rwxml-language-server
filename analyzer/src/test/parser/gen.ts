// generates parsed result, as a json format.

import { writeFileSync } from 'fs'
import stringify from 'json-stringify-safe'
import { parse } from '../../parser'
import { nodeSerializer } from './nodeSerializer'

const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <CultureDef>
    <defName>test_def_1</defName>
  </CultureDef>
</Defs>
`

const result = parse(xml)

const serialized = stringify(result, nodeSerializer(true), 4)

console.log(serialized)

writeFileSync('output.json', serialized, 'utf-8')
