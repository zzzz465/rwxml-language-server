import { spawn } from 'child_process'
import { resolve } from 'path'
import { createServer } from 'net'
import * as vscode from 'vscode'

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
	const args = vscode.workspace.getConfiguration().get<string[]>('rwxml.extractor.args') || []

	return new Promise((resolve, err) => {
		const process = spawn(exractorPath, [...args, '--OutputMode', 'stdoutBytes', ...dlls])

		// receive data over stdout
		process.stdout.on('data', (buffer: Buffer) => {
			try {
				const obj = JSON.parse(buffer.toString('utf-8'))
				resolve(obj)
			} catch (err) {
				console.log(err)
				err(err)
			}
		})

		process.stderr.on('data', (buffer: Buffer) => {
			const errmsg = buffer.toString()
			console.log(errmsg)
			err(errmsg)
		})

		process.on('exit', (code) => {
			if (code !== 0) {
				vscode.window.showErrorMessage(`extractor exit code with ${code}`)
				console.log(`extractor exit code ${code}`)
				err(code)
			}
		})

		process.on('error', (errmsg) => { // catch stderr
			vscode.window.showErrorMessage(`extractor exit code with ${errmsg}`)
			console.log(errmsg)
			err(errmsg)
		})
	})
}