import { createScanner, MultiLineStream } from '../parser/XMLScanner'
import { Repeat } from 'linq-es2015'

const _DOT = '.'.charCodeAt(0)
// charCode of 0~9, match with array index
const _NUMBER = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57]
const _OPT = '('.charCodeAt(0) // O pen P aren T hesis
const _CPT = ')'.charCodeAt(0) // C lose P aren T hesis
const _EOS = 0
const _CMA = ','.charCodeAt(0) // comma

export function isInteger(input: string): boolean {
	if (hasWhitespace(input)) return false
	const stream = new MultiLineStream(input, 0)
	while (!stream.eos()) {
		const char = stream.peekChar()
		if (48 <= char && char <= 57)
			stream.advance(1)
		else
			return false
	}

	return true
}

export function isFloat(input: string): boolean {
	if (hasWhitespace(input)) return false
	const stream = new MultiLineStream(input, 0)
	let foundDot = false // did we found any dot?
	while (!stream.eos()) {
		const char = stream.peekChar()
		if (char === _DOT) {
			if (foundDot) // no two dots.
				return false
			else
				foundDot = true
		} else if (!(48 <= char && char <= 57)) { // not 0~9
			return false
		}
		stream.advance(1) // valid 0~9, advance
	}

	return true // it is a valid one.
}

interface color {
	R: string
	G: string
	B: string
	A?: string
}

export const enum parseColorErrorCode {
	hasWhitespace, // 0
	notStartWithOPT, // 1
	invalidOPT, // 2
	invalidCPT, // 3
	invalidNumberText, // 4 not a integer value
	tooLessNumberText, // 5 less than 3
	tooManyNumberText, // 6 if more than 4 (RGBA)
	notEndWithCPT // 7
}

const enum ColorScannerState {
	None,
	afterOPT,
	afterCPT,
	afterInteger,
	afterComma
}

export function parseColor(input: string): color | parseColorErrorCode {
	if (hasWhitespace(input)) return parseColorErrorCode.hasWhitespace
	const stream = new MultiLineStream(input, 0)

	let openParenthesis = false
	const colors: string[] = [] // up to 4 (RGBA)

	if (stream.peekChar(0) !== _OPT)
		return parseColorErrorCode.notStartWithOPT

	while (!stream.eos()) {
		if (stream.advanceIfChar(_OPT)) {
			if (!openParenthesis) {
				openParenthesis = true
			}
			else // no OPT twice
				return parseColorErrorCode.invalidOPT
		} else if (stream.advanceIfChar(_CPT)) {
			if (openParenthesis && stream.peekChar(1) === _EOS) { // end with )
				openParenthesis = false
				// complete
			} else { // unexpected ) middle of text
				return parseColorErrorCode.invalidCPT
			}
		} else {
			stream.skipWhitespace()
			const offset = stream.pos()
			// can it make a performance issue? idk
			if (stream.advanceUntilRegExp(/,|\)/)) { // matches , or )  |=position -> 123,| , 123)| 
				const integerStr = input.substr(offset, (stream.pos() - offset)) // without the last one
				if (isInteger(integerStr)) { // must be a byte
					if (colors.length < 4)
						colors.push(integerStr)
					else
						return parseColorErrorCode.tooManyNumberText
				} else {
					return parseColorErrorCode.invalidNumberText
				}

				if (stream.peekChar() === _CMA) // ,
					stream.advance(1)
			}
		}
	}

	stream.goToEnd() // goto EOS, last char is peekChar(-1)
	if (stream.peekChar(-1) !== _CPT)
		return parseColorErrorCode.notEndWithCPT

	switch(colors.length) {
		case 4: {
			return {
				R: colors[0],
				G: colors[1],
				B: colors[2],
				A: colors[3]
			}
		}
		case 3: {
			return {
				R: colors[0],
				G: colors[1],
				B: colors[2]
			}
		}
		default:
			return parseColorErrorCode.tooLessNumberText
	}
}

/** check whitespace is exist in front of string or last */
export function hasWhitespace(input: string): boolean {
	return !!input.match(/^\s+|\s+$/)
}

export function isBool(input: string): boolean {
	return input === 'true' || input === 'false'
}