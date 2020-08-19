import { workspace } from 'vscode'
import { } from '@common/config'
import {  } from 'vscode-languageclient'

const configWatcher = workspace.createFileSystemWatcher('/rwconfig.json')

