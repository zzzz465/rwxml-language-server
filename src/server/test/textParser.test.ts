import * as parser from '../features/textParser'

describe('isFloat test', function () {	
	test('".1234" === float', function () {
		const flag = parser.isFloat('.1234')
		expect(flag).toBeTruthy()
	})
	test('"0.1234" === float', function () {
		const flag = parser.isFloat('0.1234')
		expect(parser.isFloat('0.1234')).toBeTruthy()
	})
	test('" 0.123 " !== float', function () {
		expect(parser.isFloat(' 0.123 ')).not.toBeTruthy()
	})
	test('" .1324 " !== float', function () {
		expect(parser.isFloat(' .1324 ')).not.toBeTruthy()
	})
	test('"0.13 24" !== float', function () {
		expect(parser.isFloat('0.13 24')).not.toBeTruthy()
	})
	test('".13 24" !== float', function () {
		expect(parser.isFloat('.13 24')).not.toBeTruthy()
	})
})

describe('isInteger test', function () {
	test('"1234" === integer', function () {
		expect(parser.isInteger('1234')).toBeTruthy()
	})

	test('"0" === integer', function () {
		expect(parser.isInteger('0')).toBeTruthy()
	})

	test('"0 123" !== integer', function () {
		expect(parser.isInteger('0 123')).not.toBeTruthy()
	})
})

describe('parseColor test', function () {
	const text0 = '(100, 255, 0)'
	test(text0, function () {
		const result = parser.parseColor(text0)
		expect(typeof result).not.toBe('number')
		if (typeof result !== 'number') {
			expect(result.R).toBe('100')
			expect(result.G).toBe('255')
			expect(result.B).toBe('0')
		}
	})

	const text1 = '100, 300, 400)'
	test(text1, function () {
		const flag = parser.parseColor(text1)
		expect(flag).toBe(parser.parseColorErrorCode.notStartWithOPT)
	})

	const text2 = '(100,250,         120)'
	test(text2, () => {
		const result = parser.parseColor(text2)
		expect(typeof result).not.toBe('number')
		if (typeof result !== 'number') {
			expect(result.R).toBe('100')
			expect(result.G).toBe('250')
			expect(result.B).toBe('120')
		}
	})

	const text3 = '(100, 180, asdf)'
	test(text3, () => {
		const flag = parser.parseColor(text3)
		expect(flag).toBe(parser.parseColorErrorCode.invalidNumberText)
	})

	const text4 = '(100, 180, 0.1)'
	test(text4, () => {
		const flag = parser.parseColor(text4)
		expect(flag).toBe(parser.parseColorErrorCode.invalidNumberText)
	})

	const text5 = '(100, 180, 30'
	test(text5, () => {
		const flag = parser.parseColor(text5)
		expect(flag).toBe(parser.parseColorErrorCode.notEndWithCPT)
	})
})