import { extractTypeInfos } from '../../typeInfo/extract'

const cwd = 'C:/Users/stopc/Documents/Github/rwxml-language-server/extractor/extractor/bin/Debug'
const core = String.raw`C:\Program Files (x86)\Steam\steamapps\common\RimWorld\RimWorldWin64_Data\Managed`
const har = String.raw`C:\Program Files (x86)\Steam\steamapps\workshop\content\294100\839005762`

async function main(): Promise<void> {
  process.env.EXTRACTOR_PATH = cwd

  extractTypeInfos(core, har)
}

main()
