import * as cheerio from 'cheerio'
import { Element, parse } from '../../parser'

describe('cheerio compability test', () => {
  test('node should work with cheerio API', () => {
    const xml = `
<?xml version="1.0" encoding="utf-8"?>
<Defs>
    <ThingDef ParentName="BaseFilth">
    <defName>Filth_Trash</defName>
    <filth>
        <placementMask> <!-- enum (flag) type -->
        <li>Terrain</li>
        <li>Unnatural</li>
        </placementMask>
    </filth>
    </ThingDef>
</Defs>
`

    const doc = parse(xml)

    const $ = cheerio.load(doc as any, { xmlMode: true })
    const defsNode = $('Defs').get(0) as unknown as Element

    expect(defsNode).toBeDefined()
  })
})
