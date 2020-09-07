import { spawn } from 'child_process'
import { resolve } from 'path'
import { createConnection, createServer } from 'net'

// the executable will be served in out or dist folder.
console.log(!!__dirname)
const exractorPath = resolve(__dirname, './extractor/extractor.exe')

/**
 * extract typeInfo from given paths.
 * @param dlls absolute paths of target dll
 */
export function extractTypeInfos(dlls: string[]): Promise<any> {
	// TODO - make a error routine when the client cannot run dotnet files.
	return new Promise((resolve, err) => {
		// create pipe to get raw typeinfos
		const server = createServer(socket => {
			console.log('connection established')
			let object : any[] | undefined = undefined
			socket.on('data', (data: Buffer) => {
				const utf8string = data.toString('utf-8') // we receive typeinfo json string(utf-8) as bytes
				object = JSON.parse(utf8string)
				console.log(`loaded typeInfo object count : ${object?.length}`)
				console.log(`target files: ${dlls}`)
				resolve(object)
			})
			socket.on('close', (flag) => {
				if (flag || !object)
					err()
				
				server.close()
			})
		}).listen('\\\\.\\pipe\\rwxml', () => {
			console.log('created pipe for transmitting raw typeInfos')
			const process = spawn(exractorPath, [...dlls]) // after listening we create a process to run extraction

			process.on('exit', (code) => {
				if (code !== 0) {
					console.log(`extractor exit code ${code}`)
					server.close()
					err(code)
				}
			})

			process.on('error', (errmsg) => { // catch stderr
				console.log(errmsg)
				server.close()
				err(errmsg)
			})
		})
	})
}