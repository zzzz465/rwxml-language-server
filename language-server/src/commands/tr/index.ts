import { Command } from 'commander'
import { isDirectory } from '../../utils/fs'

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

  // get rawXMLData from web

  // apply and get all type-injected xml

  // search all nodes and get which has [MustTranslate] tag exists

  // build path based on it

  // print output with following output format (-o json, -o yaml, -o plainText?)
}
