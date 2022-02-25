import * as ls from 'vscode-languageclient'

type TokenBaseType =
  | 'open'
  | 'open.name'
  | 'open.attribute'
  | 'open.attributeEqual'
  | 'open.attributeValue'
  | 'open.<'
  | 'open.>'
  | 'content'
  | 'close.name'
  | 'close.</'
  | 'close.>'

type ElementTokenType = `tag.${TokenBaseType}`

type InjectableTokenBaseType =
  | TokenBaseType
  | 'open.classAttribute'
  | 'open.classAttributeValue'
  | 'open.nameAttribute'
  | 'open.nameAttributeValue'
  | 'open.parentNameAttribute'
  | 'open.parentNameAttributeValue'
  | 'open.AbstractAttribute'
  | 'open.AbstractAttributeValue'

type ContentBaseType = 'defReference' | 'int' | 'float'

type InjectableTokenType = `injectable.${InjectableTokenBaseType}` | `injectable.content.${ContentBaseType}`

type DefTokenType = `def.${InjectableTokenBaseType}` | `def.content.${ContentBaseType}`

export type TokenType = ElementTokenType | InjectableTokenType | DefTokenType

export interface DocumentToken {
  range: ls.Range
  type: TokenType
}
