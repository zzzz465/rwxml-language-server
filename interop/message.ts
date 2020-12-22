import * as vscode from 'vscode'

interface _message {
	type: string
	requestId: string
}

export interface route extends _message {
	type: 'route'
	path: string
}

export type OpenDialogOptions = vscode.OpenDialogOptions

export interface openDialog extends _message {
  type: 'openDialog'
  entry: string
  options: OpenDialogOptions
}


export interface openDialogRespond extends _message {
  type: 'openDialogRespond'
  entry: string
  uris: string[] | string
}

export type message =
  | route | openDialog | openDialogRespond
