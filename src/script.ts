import { glob } from 'glob'
import { parse } from 'path'
import { writeFileSync } from 'fs'

glob('**/*.{png, jpg, jpeg, gif}', {
	cwd: 'Textures'
}, (err, matches) => {
	const paths = matches.map(d => `<Core>/${d}`)
	writeFileSync('./src/B18Textures.txt', paths.join('\n'), { encoding: 'utf-8' })
})