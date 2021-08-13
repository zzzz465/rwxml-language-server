import { ScannerState } from './ScannerState'
import { TokenType } from './TokenType'
import { MultiLineStream } from './MultiLineStream'
import { _BNG, _DQO, _EQS, _FSL, _LAN, _MIN, _QUE, _RAN, _SQO } from './char'

export interface Scanner {
  scan(): TokenType

  getTokenType(): TokenType

  getTokenOffset(): number

  getTokenLength(): number

  getTokenEnd(): number

  getTokenText(): string

  getTokenError(): string | undefined

  getScannerState(): ScannerState
}

export function createScanner(
  input: string,
  initialOffset = 0,
  initialState: ScannerState = ScannerState.WithinContent,
  emitPseudoCloseTags = false
): Scanner {
  const stream = new MultiLineStream(input, initialOffset)
  let state = initialState
  let tokenOffset = 0
  let tokenType: TokenType = TokenType.Unknown
  let tokenError: string | undefined

  let hasSpaceAfterTag: boolean
  let lastTag: string
  let lastAttributeName: string | undefined
  let lastTypeValue: string | undefined

  function nextElementName(): string {
    return stream.advanceIfRegExp(/^[_:\w][_:\w-.\d]*/).toLowerCase()
  }

  function nextAttributeName(): string {
    return stream.advanceIfRegExp(/^[^\s"'></=\x00-\x0F\x7F\x80-\x9F]*/).toLowerCase()
  }

  function finishToken(offset: number, type: TokenType, errorMessage?: string): TokenType {
    tokenType = type
    tokenOffset = offset
    tokenError = errorMessage
    return type
  }

  function scan(): TokenType {
    const offset = stream.pos()
    const oldState = state
    const token = internalScan()
    if (
      token !== TokenType.EOS &&
      offset === stream.pos() &&
      !(emitPseudoCloseTags && (token === TokenType.StartTagClose || token === TokenType.EndTagClose))
    ) {
      console.log(
        'Scanner.scan has not advanced at offset ' + offset + ', state before: ' + oldState + ' after: ' + state
      )
      stream.advance(1)
      return finishToken(offset, TokenType.Unknown)
    }
    return token
  }

  function internalScan(): TokenType {
    const offset = stream.pos()
    if (stream.eos()) {
      return finishToken(offset, TokenType.EOS)
    }
    let errorMessage

    switch (state) {
      case ScannerState.WithinComment:
        if (stream.advanceIfChars([_MIN, _MIN, _RAN])) {
          // -->
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.EndCommentTag)
        }
        stream.advanceUntilChars([_MIN, _MIN, _RAN]) // -->
        return finishToken(offset, TokenType.Comment)
      case ScannerState.WithinXMLDeclaration:
        if (stream.advanceIfChar(_RAN)) {
          // >
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.EndXMLDeclarationTag)
        }
        stream.advanceUntilChar(_RAN) // >
        return finishToken(offset, TokenType.XMLDeclaration)
      case ScannerState.WithinContent:
        if (stream.advanceIfChar(_LAN)) {
          // <
          if (!stream.eos() && stream.peekChar() === _BNG) {
            // !
            if (stream.advanceIfChars([_BNG, _MIN, _MIN])) {
              // <!--
              state = ScannerState.WithinComment
              return finishToken(offset, TokenType.StartCommentTag)
            }
          }
          if (stream.advanceIfChar(_FSL)) {
            // /
            state = ScannerState.AfterOpeningEndTag
            return finishToken(offset, TokenType.EndTagOpen)
          }
          if (stream.advanceIfChar(_QUE)) {
            // <xml
            state = ScannerState.WithinXMLDeclaration
            return finishToken(offset, TokenType.StartXMLDeclarationTag)
          }
          state = ScannerState.AfterOpeningStartTag
          return finishToken(offset, TokenType.StartTagOpen)
        }
        stream.advanceUntilChar(_LAN)
        return finishToken(offset, TokenType.Content)
      case ScannerState.AfterOpeningEndTag: {
        const tagName = nextElementName()
        if (tagName.length > 0) {
          state = ScannerState.WithinEndTag
          return finishToken(offset, TokenType.EndTag)
        }
        if (stream.skipWhitespace()) {
          // white space is not valid here
          return finishToken(offset, TokenType.Whitespace, 'Tag name must directly follow the open bracket.')
        }
        state = ScannerState.WithinEndTag
        stream.advanceUntilChar(_RAN)
        if (offset < stream.pos()) {
          return finishToken(offset, TokenType.Unknown, 'End tag name expected.')
        }
        return internalScan()
      }
      case ScannerState.WithinEndTag:
        if (stream.skipWhitespace()) {
          // white space is valid here
          return finishToken(offset, TokenType.Whitespace)
        }
        if (stream.advanceIfChar(_RAN)) {
          // >
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.EndTagClose)
        }
        if (emitPseudoCloseTags && stream.peekChar() === _LAN) {
          // <
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.EndTagClose, 'Closing bracket missing.')
        }
        errorMessage = 'Closing bracket expected.'
        break
      case ScannerState.AfterOpeningStartTag:
        lastTag = nextElementName()
        lastTypeValue = void 0
        lastAttributeName = void 0
        if (lastTag.length > 0) {
          hasSpaceAfterTag = false
          state = ScannerState.WithinTag
          return finishToken(offset, TokenType.StartTag)
        }
        if (stream.skipWhitespace()) {
          // white space is not valid here
          return finishToken(offset, TokenType.Whitespace, 'Tag name must directly follow the open bracket.')
        }
        state = ScannerState.WithinTag
        if (stream.advanceIfChars([_LAN, _FSL])) {
          // </
          state = ScannerState.AfterOpeningEndTag
          return finishToken(offset, TokenType.EndTagOpen)
        }
        stream.advanceUntilChar(_RAN)
        if (offset < stream.pos()) {
          return finishToken(offset, TokenType.Unknown, 'Start tag name expected.')
        }
        return internalScan()
      case ScannerState.WithinTag:
        if (stream.skipWhitespace()) {
          hasSpaceAfterTag = true // remember that we have seen a whitespace
          return finishToken(offset, TokenType.Whitespace)
        }
        if (hasSpaceAfterTag) {
          lastAttributeName = nextAttributeName()
          if (lastAttributeName.length > 0) {
            state = ScannerState.AfterAttributeName
            hasSpaceAfterTag = false
            return finishToken(offset, TokenType.AttributeName)
          }
        }
        if (stream.advanceIfChars([_FSL, _RAN])) {
          // />
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.StartTagSelfClose)
        }
        if (stream.advanceIfChar(_RAN)) {
          // >
          /*
          if (lastTag === 'script') {
            if (lastTypeValue && htmlScriptContents[lastTypeValue]) {
              // stay in html
              state = ScannerState.WithinContent;
            } else {
              state = ScannerState.WithinScriptContent;
            }
          } else if (lastTag === 'style') {
            state = ScannerState.WithinStyleContent;
          } else {
            state = ScannerState.WithinContent;
          }
          */
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.StartTagClose)
        }
        if (emitPseudoCloseTags && stream.peekChar() === _LAN) {
          // <
          state = ScannerState.WithinContent
          return finishToken(offset, TokenType.StartTagClose, 'Closing bracket missing.')
        }
        stream.advance(1)
        return finishToken(offset, TokenType.Unknown, 'Unexpected character in tag.')
      case ScannerState.AfterAttributeName:
        if (stream.skipWhitespace()) {
          hasSpaceAfterTag = true
          return finishToken(offset, TokenType.Whitespace)
        }

        if (stream.advanceIfChar(_EQS)) {
          state = ScannerState.BeforeAttributeValue
          return finishToken(offset, TokenType.DelimiterAssign)
        }
        state = ScannerState.WithinTag
        return internalScan() // no advance yet - jump to WithinTag
      case ScannerState.BeforeAttributeValue: {
        if (stream.skipWhitespace()) {
          return finishToken(offset, TokenType.Whitespace)
        }
        // in xml we don't have any attribute value that is not capsuled with "", or ''
        // let attributeValue = stream.advanceIfRegExp(/^[^\s"'`=<>]+/);
        // if (attributeValue.length > 0) {
        // if (stream.peekChar() === _RAN && stream.peekChar(-1) === _FSL) { // <foo bar=http://foo/>
        // stream.goBack(1);
        // attributeValue = attributeValue.substr(0, attributeValue.length - 1);
        // }
        // if (lastAttributeName === 'type') {
        // lastTypeValue = attributeValue;
        // }
        // state = ScannerState.WithinTag;
        // hasSpaceAfterTag = false;
        // return finishToken(offset, TokenType.AttributeValue);
        // }
        const ch = stream.peekChar()
        if (ch === _SQO || ch === _DQO) {
          stream.advance(1) // consume quote
          if (stream.advanceUntilChar(ch)) {
            stream.advance(1) // consume quote
          }
          // if (lastAttributeName === 'type') {
          // lastTypeValue = stream.getSource().substring(offset + 1, stream.pos() - 1);
          // }
          state = ScannerState.WithinTag
          hasSpaceAfterTag = false
          return finishToken(offset, TokenType.AttributeValue)
        }
        state = ScannerState.WithinTag
        hasSpaceAfterTag = false
        return internalScan() // no advance yet - jump to WithinTag
      }
      case ScannerState.WithinScriptContent: {
        // see http://stackoverflow.com/questions/14574471/how-do-browsers-parse-a-script-tag-exactly
        let scriptState = 1
        while (!stream.eos()) {
          const match = stream.advanceIfRegExp(/<!--|-->|<\/?script\s*\/?>?/i)
          if (match.length === 0) {
            stream.goToEnd()
            return finishToken(offset, TokenType.Script)
          } else if (match === '<!--') {
            if (scriptState === 1) {
              scriptState = 2
            }
          } else if (match === '-->') {
            scriptState = 1
          } else if (match[1] !== '/') {
            // <script
            if (scriptState === 2) {
              scriptState = 3
            }
          } else {
            // </script
            if (scriptState === 3) {
              scriptState = 2
            } else {
              stream.goBack(match.length) // to the beginning of the closing tag
              break
            }
          }
        }
        state = ScannerState.WithinContent
        if (offset < stream.pos()) {
          return finishToken(offset, TokenType.Script)
        }
        return internalScan() // no advance yet - jump to content
      }
      case ScannerState.WithinStyleContent: {
        stream.advanceUntilRegExp(/<\/style/i)
        state = ScannerState.WithinContent
        if (offset < stream.pos()) {
          return finishToken(offset, TokenType.Styles)
        }
        return internalScan() // no advance yet - jump to content
      }
    }

    stream.advance(1)
    state = ScannerState.WithinContent
    return finishToken(offset, TokenType.Unknown, errorMessage)
  }

  return {
    scan,
    getTokenType: () => tokenType,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => stream.pos() - tokenOffset,
    getTokenEnd: () => stream.pos(),
    getTokenText: () => stream.getSource().substring(tokenOffset, stream.pos()),
    getScannerState: () => state,
    getTokenError: () => tokenError,
  }
}
