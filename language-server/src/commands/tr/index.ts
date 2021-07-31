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
import { XMLNode } from '../../parser/XMLNode'

export default function (command: Command): void {
  const cmd = command.command('tr')

  cmd.command('extract <directory>').requiredOption('-l, --language-code', 'langauge code, example: ').action(extract)
}

async function extract(dirPath: string, options: any): Promise<void> {
  // validate directory is valid
  if (!(await isDirectory(dirPath))) {
    throw new Error(`directory ${dirPath} is not a valid path.`)
  }

  // get manifest from web
  let { data, status } = await axios.get(METADATA_URL)
  if (status !== 200) {
    throw new Error(`cannot get manifest from web, url: ${METADATA_URL}`)
  }

  const metadata = yaml.load(data) as Metadata | undefined
  if (!metadata) {
    throw new Error(`cannot parse metadata from given data: ${data}`)
  }

  // get rawXMLData from web
  const rwVersion = options['version'] ?? '1.3'
  const rawTypeInfosURL = metadata.version[rwVersion]?.rawTypeInfos
  if (!rawTypeInfosURL) {
    throw new Error(`rawTypeInfos in metadata is undefined, metadata url: ${METADATA_URL}`)
  }

  ;[data, status] = await axios.get(rawTypeInfosURL.core.url)
  if (status !== 200) {
    throw new Error(`cannot get rawTypeInfo core.json from web, url: ${rawTypeInfosURL.core.url}`)
  }

  // parse rawTypeInfo and get typeInfoMap, injector
  const coreRawTypeInfos = JSON.parse(data) as RawTypeInfo[]
  const typeInfoMap = TypeInfoLoader.load(coreRawTypeInfos)

  // grab all paths of xmls
  const searchPath = normalize(path.join(dirPath, '**/*.xml'))
  const pathToXMLs = await glob(searchPath, { absolute: true, onlyFiles: true, unique: true })

  // load all xmls as string
  const xmls = await Promise.all(pathToXMLs.map((p) => fs.promises.readFile(p, { encoding: 'utf-8' })))

  // parse xmls
  const xmlDocuments = xmls.map((xml) => new XMLParser(xml).parse())

  // inject type into xml
  const injectedResults = xmlDocuments.map((xmlDocument) => TypeInfoInjector.inject(xmlDocument, typeInfoMap))

  // search all nodes and get which has [MustTranslate] tag exists
  const translateNodes: XMLNode[] = []
  const predicate = (node: Injectable) => {
    // TODO: filter by mustTranslate
    return false
  }
  // build path based on it

  // print output with following output format (-o json, -o yaml, -o plainText?)
}
