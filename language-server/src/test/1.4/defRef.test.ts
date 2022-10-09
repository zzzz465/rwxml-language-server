import { DefDatabase, NameDatabase, parse, TypeInfoLoader, TypeInfoMap } from '@rwxml/analyzer'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { DefManager } from '../../defManager'
import * as documentWithNodeMap from '../../documentWithNodeMap'
import { Reference } from '../../features/reference'
import typeInfo from './typeInfo.json'

describe('def reference test', () => {
  let typeMap: TypeInfoMap

  beforeAll(() => {
    typeMap = TypeInfoLoader.load((typeInfo as any).rawData)
  })

  beforeEach(() => {
    container.clearInstances()
  })

  it('it should pass', () => {
    return
  })

  it('should be able to reference a def', () => {
    const target = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <RulePackDef>
    <defName>NamerIdeoAstropolitan</defName>
    <include>
      <li>NamerIdeoGlobal</li>
      <li>CultureSpacer</li>
    </include>
  </RulePackDef>
</Defs>
`

    const ref = `
<?xml version="1.0" encoding="utf-8" ?>
<Defs>
  <CultureDef>
    <defName>Heruan_Triune</defName>
    <label>Triune</label>
    <description>A broad collection of cultures common among frequent space travelers.</description>
    <ideoNameMaker MayRequire="Ludeon.RimWorld.Ideology">NamerIdeoAstropolitan</ideoNameMaker>
  </CultureDef>
</Defs>
`

    const defManager = new DefManager(new DefDatabase(), new NameDatabase(), typeMap, '1.4')
    const targetXML = documentWithNodeMap.create(parse(target, 'target.xml'))
    defManager.update(targetXML)
    expect(defManager.getDef('RulePackDef', 'NamerIdeoAstropolitan')).toHaveLength(1)
    const targetDef = defManager.getDef('RulePackDef', 'NamerIdeoAstropolitan')[0]

    const refXML = documentWithNodeMap.create(parse(ref, 'ref.xml'))
    defManager.update(refXML)
    expect(defManager.getDef('CultureDef', 'Heruan_Triune')).toHaveLength(1)
    const refDef = defManager.getDef('CultureDef', 'Heruan_Triune')[0]

    // HACK
    // TODO: fix this
    const reference = new Reference(null as any)
    const location = reference.findDefReference(defManager, refDef, 286)
    expect(location).not.toBeNull()
  })
})
