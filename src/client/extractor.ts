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
				extractorProcess = spawn(`mono`, [`${extractorPath}`, ...args, '--OutputMode', 'stdoutBytes', ...dlls])
		}

		if (extractorProcess) {
			// receive data over stdout
			const buffers: Uint8Array[] = []
			extractorProcess.stdout.on('data', (data: Buffer) => {
				buffers.push(data) // on linux, the stdout buffer is limited to 65536, so we have to concat multiple writes
			})

			extractorProcess.stderr.on('data', (buffer: Buffer) => {
				const errmsg = buffer.toString()
				vscode.window.showErrorMessage(`encounted an error while parsing data, ${errmsg}`)
				err(errmsg)
			})

			extractorProcess.on('exit', (code) => {
				if (code === 0) {
					const buffer = Buffer.concat(buffers)
					try { // is stdout still alive after the process exit???
						const convertedString = buffer.toString('utf-8')
						const object = JSON.parse(convertedString)
						resolve(object)
					} catch (error) {
						vscode.window.showErrorMessage(`encounted an error while parsing data, ${error}`)
						err(error)
					}
				} else {
					vscode.window.showErrorMessage(`extractor exit code with ${code}`)
					console.log(`extractor exit code ${code}`)
					err(code)
				}
			})

			extractorProcess.on('error', (errmsg) => { // catch stderr
				vscode.window.showErrorMessage(`cannot create extractor process, err: ${errmsg}`)
				err(errmsg)
			})
		} else {
			vscode.window.showErrorMessage(`current platform ${platform()} is not supported.`)
		}
	})
}