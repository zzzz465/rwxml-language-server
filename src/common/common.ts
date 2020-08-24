import { RequestType } from 'vscode-languageserver'

// import { } from './'

export type absPath = string // accepts Uri.fsPath, or any real path

export type respond = {
	absPath: absPath,
	text: string
}

export const TextReuqestType = new RequestType<absPath[], respond[], undefined>('text/request')