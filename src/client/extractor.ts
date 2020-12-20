import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { resolve } from 'path'
import { createServer } from 'net'
import * as vscode from 'vscode'
import { platform } from 'os'

// the executable will be served in out folder.
let platformSpecificPath = ''
switch (platform()) {
	case 'win32':
		platformSpecificPath = 'windows'
		break

	case 'linux':
		platformSpecificPath = 'linux'
		break

	default:
		console.error(`platform ${platformSpecificPath} is not supported`)
}
// __dirname = "out/client/"
const extractorPath = resolve(__dirname, './extractor', platformSpecificPath, 'extractor.exe')

/**
 * extract typeInfo from given paths.  
 * note: it cannot be asynchronized! you must wait to call a new one after the previous one is completed.
 * @param dlls absolute paths of target dll
 */
export function extractTypeInfos(dlls: string[], isDevelopment: boolean): Promise<any> {
	// TODO - make a error routine when the client cannot run dotnet files.
	const args = vscode.workspace.getConfiguration().get<string[]>('rwxml.extractor.args') || []

	return new Promise((resolve, err) => {
		let extractorProcess: ChildProcessWithoutNullStreams | undefined = undefined
		switch (platform()) {
			case 'win32':
				extractorProcess = spawn(extractorPath, [...args, '--OutputMode', 'stdoutBytes', ...dlls])
				break
			case 'linux':
				extractorProcess = spawn(`mono ${extractorPath}`, [...args, '--OutputMode', 'stdoutBytes', ...dlls])
		}

		if (extractorProcess) {
			// receive data over stdout
			let resolved = false;
			extractorProcess.stdout.on('data', (buffer: Buffer) => {
				try {
					const obj = JSON.parse(buffer.toString('utf-8'))
					resolve(obj)
					resolved = true;
				} catch (err) {
					console.log(err)
					err(err)
				}
			})

			extractorProcess.stderr.on('data', (buffer: Buffer) => {
				const errmsg = buffer.toString()
				console.log(errmsg)
				err(errmsg)
			})

			extractorProcess.on('exit', (code) => {
				if (code !== 0) {
					vscode.window.showErrorMessage(`extractor exit code with ${code}`)
					console.log(`extractor exit code ${code}`)
					err(code)
				} else {
					if (!resolved) {
						resolve([])
						resolved = true
					}
				}
			})

			extractorProcess.on('error', (errmsg) => { // catch stderr
				vscode.window.showErrorMessage(`extractor exit code with ${errmsg}`)
				console.log(errmsg)
				err(errmsg)
			})
		} else {
			vscode.window.showErrorMessage(`current platform ${platform()} is not supported.`)
		}
	})
}