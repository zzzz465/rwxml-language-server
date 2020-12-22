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

export interface alert extends _message {
  type: 'alert'
  text: string
}

export interface config extends _message {
  type: 'config'  
  data: any
}

export interface saveConfig extends _message {
  type: 'saveConfig'
  data: any
}

export type message =
  | route | openDialog | openDialogRespond | alert
  | config | saveConfig
