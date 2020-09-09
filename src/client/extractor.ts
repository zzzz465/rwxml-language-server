import { spawn } from 'child_process'
import { resolve } from 'path'
import { createServer } from 'net'

// the executable will be served in out or dist folder.
console.log(!!__dirname)
const exractorPath = resolve(__dirname, './extractor/extractor.exe')

/**
 * extract typeInfo from given paths.  
 * note: it cannot be asynchronized! you must wait to call a new one after the previous one is completed.
 * @param dlls absolute paths of target dll
 */
export function extractTypeInfos(dlls: string[]): Promise<any> {
	// TODO - make a error routine when the client cannot run dotnet files.
	return new Promise((resolve, err) => {
		const process = spawn(exractorPath, ['--stdout', ...dlls])

		// receive data over stdout
		process.stdout.on('data', (buffer: Buffer) => {
			try {
				const obj = JSON.parse(buffer.toString('utf-8'))
				console.log(`loaded typeInfo object count : ${obj.length}`)
				resolve(obj)
			} catch (err) {
				console.log(err)
				err(err)
			}
		})

		process.stderr.on('data', (buffer: Buffer) => {
			console.log(buffer.toString())
		})

		process.on('exit', (code) => {
			if (code !== 0) {
				console.log(`extractor exit code ${code}`)
				err(code)
			}
		})

		process.on('error', (errmsg) => { // catch stderr
			console.log(errmsg)
			err(errmsg)
		})
	})
}