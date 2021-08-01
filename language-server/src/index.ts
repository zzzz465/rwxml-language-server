import { Command } from 'commander'
import initCommand from './commands'

const program = new Command()

program.version('0.0.1', '-v, --version')

initCommand(program)

program.parse(process.argv)
