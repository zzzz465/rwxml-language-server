import { Command } from 'commander'
import tr from './tr'

export default function (command: Command): void {
  command.addCommand(tr())
}
