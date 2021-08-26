import { TypeInfoLoader, RawTypeInfo, TypeInfoInjector, parse } from '../..'
import core from './core.json'

describe('wrong xml test', () => {
  test('injector should not throw error if no Defs node exists', () => {
    const wrongXML = `
    <?xml version="1.0" encoding="utf-8" ?>
    <D>
    </D>
    `

    const root = parse(wrongXML)
    const map = TypeInfoLoader.load(core as RawTypeInfo[])
    const injector = new TypeInfoInjector(map)

    injector.inject(root)
  })
})
