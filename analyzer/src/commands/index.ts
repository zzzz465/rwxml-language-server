import { Command } from 'commander'
import tr from './tr'

const program = new Command()

program.version('0.0.1', '-v, --version')

program.addCommand(tr())

program.parse(process.argv)
