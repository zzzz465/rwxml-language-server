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
import { TypeInfoLoader } from '../../rimworld-types'
import { RawTypeInfo } from '../../rimworld-types/rawTypeInfo'
import { TypeInfoInjector } from '../../rimworld-types/typeInfoInjector'
import { Injectable } from '../../rimworld-types/injectable'
import { AsEnumerable } from 'linq-es2015'

export default function () {
  const command = new Command('tr')

  command
    .command('extract <directory>')
    .option('-l, --language-code <languageCode>', 'langauge code, example: en,ko', 'en,ko')
    .option('-a, --add-regex [filters...]', 'add filter regex, example: *.description')
    .option('--filterFile [filterFiles...]', 'add file that contians list of filter regex, splitted by LF')
    .action(extract)

  return command
}

interface Options {
  languageCode?: string
  addRegex?: string[]
  filterFile?: string[]
}

async function extract(dirPath: string, options: Options): Promise<void> {
  // validate directory is valid
  if (!(await isDirectory(dirPath))) {
    throw new Error(`directory ${dirPath} is not a valid path.`)
  }

  const regexFilters: RegExp[] = []

  for (const file of options.filterFile ?? []) {
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, { encoding: 'utf-8' })
      regexFilters.push(...text.split('\n').map((r) => new RegExp(r, 'g')))
    } else {
      throw new Error(`file ${file} that you provided do not exist.`)
    }
  }

  for (const filter of options.addRegex ?? []) {
    regexFilters.push(new RegExp(filter, 'g'))
  }

  // get manifest from web
  /*
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
  */

  // use local rawTypeInfo
  const corePath = path.join(__dirname, '../../../../metadata/rawTypeInfos/1.3/core.json')
  const coreRawTypeInfoText = await fs.promises.readFile(corePath, {
    encoding: 'utf-8',
  })
  const coreRawTypeInfos = JSON.parse(coreRawTypeInfoText)
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
    const xmlDocument = new XMLParser(text, uri).parse()
    xmlDocument.uri = uri

    return xmlDocument
  })

  const typeInfoInjector = new TypeInfoInjector(typeInfoMap)

  // inject type into xml
  const injectedResults = xmlDocuments.map((xmlDocument) => typeInfoInjector.inject(xmlDocument))

  // search all nodes and get which has [MustTranslate] tag exists
  const defs = AsEnumerable(injectedResults)
    .SelectMany((d) => d.defs)
    .Where((d) => d.getDefName() !== undefined)
    .ToArray()

  // get all injectables
  const injectables: Injectable[] = []
  for (const def of defs) {
    def.findNode(injectables, (inj) => inj instanceof Injectable)
  }

  const translatorNodes: Injectable[] = AsEnumerable(injectables)
    .Where((injectable) => injectable.getDefPath() !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .Where((d) => regexFilters.length == 0 || regexFilters.some((f) => f.test(d.getDefPath()!)))
    .ToArray()

  // print all nodes
  for (const node of translatorNodes) {
    console.log(`path: ${node.getDefPath()}, content: ${node.content}`)
  }
}
