import { RequestType } from 'vscode-languageserver'

// import { } from './'

/** path represents absoulte path start from disk letter  
 * @deprecated should be removed asap 
 * @example C:/path/to/directory 
 * @example C:/path/to/file.ext
*/
export type absPath = string
export type URILike = string

export type respond = {
	absPath: absPath,
	text: string
}

export const TextReuqestType = new RequestType<absPath[], respond[], undefined>('text/request')