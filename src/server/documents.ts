import { Connection, TextDocuments } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Uri } from 'vscode'
import { relative } from 'path'
import { LoadFolders } from '../common/config'
import { def } from './RW/TypeInfo'

export interface RWTextDocument extends TextDocument {
	loadFolders?: LoadFolders
	Defs?: def[]
}