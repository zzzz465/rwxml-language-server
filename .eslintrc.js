/**@type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
		'only-warn',
		'prettier'
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:prettier/recommended',
		'typescript'
	],
	rules: {
		// 'curly': ['warn', ]
		'no-inner-declarations': 'off',
		'@typescript-eslint/no-namespace': 'off',
		'semi': ['warn', 'never'],
		'prettier/prettier': ['warn', {
			'endOfLine': 'auto',
			'semi': false
		}]
	}
};