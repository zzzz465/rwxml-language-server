import { RequestType } from 'vscode-languageserver'

// import { } from './'

/** path represents absoulte path start from disk letter  
 * @example C:/path/to/directory 
 * @example C:/path/to/file.ext
*/
export type absPath = string

/** uri string that can be parsed with vscode-URI */
export type URILike = string

/** relative path string */
export type relativePath = string

export type respond = {
	URILike: URILike,
	text: string
}

// export const TextReuqestType = new RequestType<URILike[], respond[], undefined>('text/request')