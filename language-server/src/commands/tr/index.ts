import { Command } from 'commander'
import { isDirectory } from '../../utils/fs'
import axios from 'axios'
import { METADATA_URL } from '../../metadata/const'
import * as yaml from 'js-yaml'
import { Metadata } from '../../metadata/metadata'
import * as path from 'path'
import glob from 'fast-glob'
import normalize from 'normalize-path'
import * as fs from 'fs'
import { XMLParser } from '../../parser/XMLParser'
import TypeInfoLoader from '../../rimworld-types/typeInfoLoader'
import { RawTypeInfo } from '../../rimworld-types/rawTypeInfo'
import TypeInfoInjector from '../../rimworld-types/typeInfoInjector'
import { Injectable } from '../../rimworld-types/injectable'
import { AsEnumerable } from 'linq-es2015'

export default function () {
  const command = new Command('tr')

  command
    .command('extract <directory>')
    .option('-l, --language-code', 'langauge code, example: ', 'en,ko')
    .action(extract)

  return command
}

async function extract(dirPath: string, options: any): Promise<void> {
  // validate directory is valid
  if (!(await isDirectory(dirPath))) {
    throw new Error(`directory ${dirPath} is not a valid path.`)
  }

  // get manifest from web
  let res = await axios.get(METADATA_URL)
  if (res.status !== 200) {
    throw new Error(`cannot get manifest from web, url: ${METADATA_URL}`)
  }

  const metadata = yaml.load(res.data) as Metadata | undefined
  if (!metadata) {
    throw new Error(`cannot parse metadata from given data: ${res.data}`)
  }

  // get rawXMLData from web
  const rwVersion = options['version'] ?? '1.3'
  const rawTypeInfosURL = metadata.version[rwVersion]?.rawTypeInfos
  if (!rawTypeInfosURL) {
    throw new Error(`rawTypeInfos in metadata is undefined, metadata url: ${METADATA_URL}`)
  }

  res = await axios.get(rawTypeInfosURL.core.url)
  if (res.status !== 200) {
    throw new Error(`cannot get rawTypeInfo core.json from web, url: ${rawTypeInfosURL.core.url}`)
  }

  // parse rawTypeInfo and get typeInfoMap, injector

  // const coreRawTypeInfos = JSON.parse(res.data) as RawTypeInfo[]
  const coreRawTypeInfos = res.data as RawTypeInfo[] // already parsed in axios module
  const typeInfoMap = TypeInfoLoader.load(coreRawTypeInfos)

  // grab all paths of xmls
  const searchPath = normalize(dirPath)
  const pathToXMLs = await glob('**/*.xml', { absolute: true, cwd: searchPath })

  // load all xmls as string
  const xmls = await Promise.all(
    pathToXMLs.map(async (uri) => {
      const text = await fs.promises.readFile(uri, { encoding: 'utf-8' })
      return {
        text,
        uri,
      }
    })
  )

  // parse xmls
  const xmlDocuments = xmls.map(({ uri, text }) => {
    const xmlDocument = new XMLParser(text).parse()
    xmlDocument.uri = uri

    return xmlDocument
  })

  // inject type into xml
  const injectedResults = xmlDocuments.map((xmlDocument) => TypeInfoInjector.inject(xmlDocument, typeInfoMap))

  // search all nodes and get which has [MustTranslate] tag exists
  const defs = AsEnumerable(injectedResults)
    .SelectMany((d) => d.defs)
    .Where((d) => d.getDefName() !== undefined)
    .ToArray()

  // get all injectables
  const injectables: Injectable[] = []
  for (const def of defs) {
    const uri = def.document.uri
    const allInjectables: Injectable[] = []
    def.findNode(allInjectables, (inj) => inj instanceof Injectable)

    console.log(allInjectables.length)
  }

  const translatorNodes: Injectable[] = AsEnumerable(injectables)
    .Where((injectable) => injectable.getDefPath() !== undefined)
    .ToArray()

  // print all nodes
  for (const node of translatorNodes) {
    console.log(`path: ${node.getDefPath()}, content: ${node.content}`)
  }

  // build path based on it
  // 1. get Def node
  // 2. get parent chain
  // 3. ... 이게 맞나?

  // 그냥...
  // 1. get Def node
  // 2. traverse all child nodes while building path
  // 3. if fieldMetadata has attribute mustTranslate, add it

  // 결국, 현재 Node 만 가지고 바로 path 를 추출하는 알고리즘을 제작하면 된다.

  // print output with following output format (-o json, -o yaml, -o plainText?)
}
