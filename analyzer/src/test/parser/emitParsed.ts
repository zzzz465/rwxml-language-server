import { writeFileSync } from 'fs'
import stringify from 'json-stringify-safe'
import { parse } from '../../parser'

const xml = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
</Defs>
`

const doc = parse(xml)
const docSerialized = stringify(doc)

console.log(typeof docSerialized)

writeFileSync('./result.json', docSerialized)
