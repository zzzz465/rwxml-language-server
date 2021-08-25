// source code: https://github.com/fb55/htmlparser2
// all rights goes to original author.
import { Tokenizer } from './Tokenizer'

export interface ParserOptions {
  /**
   * Indicates whether special tags (`<script>`, `<style>`, and `<title>`) should get special treatment
   * and if "empty" tags (eg. `<br>`) can have children.  If `false`, the content of special tags
   * will be text only. For feeds and other XML content (documents that don't consist of HTML),
   * set this to `true`.
   *
   * @default true
   */
  xmlMode: true

  /**
   * Decode entities within the document.
   *
   * @default true
   */
  decodeEntities?: boolean

  /**
   * If set to true, CDATA sections will be recognized as text even if the xmlMode option is not enabled.
   * NOTE: If xmlMode is set to `true` then CDATA sections will always be recognized as text.
   *
   * @default xmlMode
   */
  recognizeCDATA?: boolean

  /**
   * If set to `true`, self-closing tags will trigger the onclosetag event even if xmlMode is not set to `true`.
   * NOTE: If xmlMode is set to `true` then self-closing tags will always be recognized.
   *
   * @default xmlMode
   */
  recognizeSelfClosing?: boolean

  /**
   * Allows the default tokenizer to be overwritten.
   */
  Tokenizer?: typeof Tokenizer
}

export interface Handler {
  onparserinit(parser: Parser): void

  /**
   * Resets the handler back to starting state
   */
  onreset(): void

  /**
   * Signals the handler that parsing is done
   */
  onend(): void
  onerror(error: Error): void
  onclosetag(name: string): void
  onopentagname(name: string): void
  /**
   *
   * @param name Name of the attribute
   * @param value Value of the attribute.
   * @param quote Quotes used around the attribute. `null` if the attribute has no quotes around the value, `undefined` if the attribute has no value.
   */
  onattribute(name: string, value: string, quote?: string | undefined | null): void
  onopentag(name: string, attribs: { [s: string]: string }): void
  ontext(data: string): void
  oncomment(data: string): void
  oncdatastart(): void
  oncdataend(): void
  oncommentend(): void
  onprocessinginstruction(name: string, data: string): void
}

const reNameEnd = /\s|\//

export class Parser {
  /** The start index of the last event. */
  public startIndex = 0
  /** The end index of the last event. */
  public endIndex = 0

  private tagname = ''
  private attribname = ''
  private attribvalue = ''
  private attribs: null | { [key: string]: string } = null
  private stack: string[] = []
  private readonly cbs: Partial<Handler>
  private readonly tokenizer: Tokenizer

  constructor(cbs?: Partial<Handler> | null, private readonly options: ParserOptions = { xmlMode: true }) {
    this.options = options
    this.cbs = cbs ?? {}
    this.tokenizer = new (options.Tokenizer ?? Tokenizer)(this.options, this)
    this.cbs.onparserinit?.(this)
  }

  private updatePosition(offset: number) {
    this.startIndex = this.tokenizer.getAbsoluteSectionStart() - offset
    this.endIndex = this.tokenizer.getAbsoluteIndex()
  }

  // Tokenizer event handlers
  ontext(data: string): void {
    this.startIndex = this.tokenizer.getAbsoluteSectionStart()
    this.endIndex = this.tokenizer.getAbsoluteIndex() - 1
    this.cbs.ontext?.(data)
  }

  onopentagname(name: string): void {
    this.updatePosition(1)
    this.emitOpenTag(name)
  }

  private emitOpenTag(name: string) {
    this.tagname = name
    this.stack.push(name)
    this.cbs.onopentagname?.(name)
    if (this.cbs.onopentag) this.attribs = {}
  }

  onopentagend(): void {
    this.endIndex = this.tokenizer.getAbsoluteIndex()

    if (this.attribs) {
      this.cbs.onopentag?.(this.tagname, this.attribs)
      this.attribs = null
    }
    this.tagname = ''
  }

  onclosetag(name: string): void {
    this.updatePosition(2)
    if (this.stack.length) {
      let pos = this.stack.lastIndexOf(name)
      if (pos !== -1) {
        if (this.cbs.onclosetag) {
          pos = this.stack.length - pos
          while (pos--) {
            // We know the stack has sufficient elements.
            this.cbs.onclosetag(this.stack.pop() as string)
          }
        } else {
          this.stack.length = pos
        }
      }
    }
  }

  onselfclosingtag(): void {
    this.closeCurrentTag()
  }

  private closeCurrentTag() {
    const name = this.tagname
    this.onopentagend()
    /*
     * Self-closing tags will be on the top of the stack
     * (cheaper check than in onclosetag)
     */
    if (this.stack[this.stack.length - 1] === name) {
      this.cbs.onclosetag?.(name)
      this.stack.pop()
    }
  }

  onattribname(name: string): void {
    this.attribname = name
  }

  onattribdata(value: string): void {
    this.attribvalue += value
  }

  onattribend(quote: string | undefined | null): void {
    this.cbs.onattribute?.(this.attribname, this.attribvalue, quote)
    if (this.attribs && !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue
    }
    this.attribname = ''
    this.attribvalue = ''
  }

  private getInstructionName(value: string) {
    const idx = value.search(reNameEnd)
    const name = idx < 0 ? value : value.substr(0, idx)

    return name
  }

  ondeclaration(value: string): void {
    if (this.cbs.onprocessinginstruction) {
      this.updatePosition(2)
      const name = this.getInstructionName(value)
      this.cbs.onprocessinginstruction(`!${name}`, `!${value}`)
    }
  }

  onprocessinginstruction(value: string): void {
    if (this.cbs.onprocessinginstruction) {
      this.updatePosition(2)
      const name = this.getInstructionName(value)
      this.cbs.onprocessinginstruction(`?${name}`, `?${value}`)
    }
  }

  oncomment(value: string): void {
    this.updatePosition(4)
    this.cbs.oncomment?.(value)
    this.cbs.oncommentend?.()
  }

  oncdata(value: string): void {
    this.updatePosition(1)
    if (this.options.xmlMode || this.options.recognizeCDATA) {
      this.cbs.oncdatastart?.()
      this.cbs.ontext?.(value)
      this.cbs.oncdataend?.()
    } else {
      this.oncomment(`[CDATA[${value}]]`)
    }
  }

  onerror(err: Error): void {
    this.cbs.onerror?.(err)
  }

  onend(): void {
    if (this.cbs.onclosetag) {
      for (let i = this.stack.length; i > 0; this.cbs.onclosetag(this.stack[--i]));
    }
    this.cbs.onend?.()
  }

  /**
   * Resets the parser to a blank state, ready to parse a new HTML document
   */
  public reset(): void {
    this.cbs.onreset?.()
    this.tokenizer.reset()
    this.tagname = ''
    this.attribname = ''
    this.attribs = null
    this.stack = []
    this.cbs.onparserinit?.(this)
  }

  /**
   * Resets the parser, then parses a complete document and
   * pushes it to the handler.
   *
   * @param data Document to parse.
   */
  public parseComplete(data: string): void {
    this.reset()
    this.end(data)
  }

  /**
   * Parses a chunk of data and calls the corresponding callbacks.
   *
   * @param chunk Chunk to parse.
   */
  public write(chunk: string): void {
    this.tokenizer.write(chunk)
  }

  /**
   * Parses the end of the buffer and clears the stack, calls onend.
   *
   * @param chunk Optional final chunk to parse.
   */
  public end(chunk?: string): void {
    this.tokenizer.end(chunk)
  }

  /**
   * Pauses parsing. The parser won't emit events until `resume` is called.
   */
  public pause(): void {
    this.tokenizer.pause()
  }

  /**
   * Resumes parsing after `pause` was called.
   */
  public resume(): void {
    this.tokenizer.resume()
  }

  /**
   * Alias of `write`, for backwards compatibility.
   *
   * @param chunk Chunk to parse.
   * @deprecated
   */
  public parseChunk(chunk: string): void {
    this.write(chunk)
  }
  /**
   * Alias of `end`, for backwards compatibility.
   *
   * @param chunk Optional final chunk to parse.
   * @deprecated
   */
  public done(chunk?: string): void {
    this.end(chunk)
  }
}
