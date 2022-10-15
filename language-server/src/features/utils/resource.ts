import { TypedElement } from '@rwxml/analyzer'
import { Project } from '../../project'

/*
uiIconPath
texPath
path
settlementTexturePath
factionIconPath
wornGraphicPath
iconPath
texturePath
cornerXX (TL, TR, BL, BR ...)
edgeXX (top, bottom, left, right, ...)
shaderparameter
- _FallColorDestination
- _MainTex
symbol
headerIcon
portraitLarge
portraitTiny
fuelIconPath
texture
siteTExture
expandingIconTexture
*/

export const enum TextureResourceType {
  SingleFile,
  FileWithCompass,
  Directory,
  Unknown,
}

export function getTextureResourceNodeType(project: Project, node: TypedElement): TextureResourceType {
  const name = node.name

  switch (name) {
    case 'uiIconPath':
    case 'texPath':
    case 'path':
    case 'settlementTexturePath':
    case 'factionIconPath':
    case 'wornGraphicPath':
    case 'iconPath':
    case 'texturePath':
    case 'symbol':
    case 'headerIcon':
    case 'texture':
    case 'siteTexture':
    case 'expandingIconTexture':
      return TextureResourceType.SingleFile

    default:
      return TextureResourceType.Unknown
  }
}
