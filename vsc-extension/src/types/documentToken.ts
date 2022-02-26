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

type ElementTokenType =
  | 'tag' // tag startIndex 부터, endIndex 까지
  | `tag.${TokenBaseType}`

type InjectableTokenBaseType =
  | TokenBaseType
  | 'open.classAttribute'
  | 'open.classAttributeValue'
  | 'open.nameAttribute'
  | 'open.nameAttributeValue'
  | 'open.nameAttributeValue.linked'
  | 'open.parentNameAttribute'
  | 'open.parentNameAttributeValue'
  | 'open.parentNameAttributeValue.linked'
  | 'open.AbstractAttribute'
  | 'open.AbstractAttributeValue'

type ContentBaseType = 'defReference' | 'defReference.linked' | 'int' | 'float'

type InjectableTokenType = `injectable.${InjectableTokenBaseType}` | `injectable.content.${ContentBaseType}`

type DefTokenType = `def.${InjectableTokenBaseType}`

type RootDefsTokenType = `defs.${TokenBaseType}`

export type TokenType = ElementTokenType | InjectableTokenType | DefTokenType | RootDefsTokenType

export interface DocumentToken {
  range: ls.Range
  type: TokenType
}
