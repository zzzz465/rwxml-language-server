import { execFile } from 'child_process'
import { createConnection, createServer } from 'net'

export function getExtractorDirectory() {
  const path = process.env.EXTRACTOR_PATH
  if (path) {
    return path
  } else {
    throw new Error(`file: ${path} is not a valid extractor.`)
  }
}

const timeout = 60000 // 60 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[]> {
  const cwd = getExtractorDirectory()

  const server = createServer()
  server.listen(9870, '127.0.0.1')

  // on windows, process cannot be launched with execFile
  // https://stackoverflow.com/questions/46445805/exec-vs-execfile-nodejs
  const p = execFile('extractor.exe', [...dllPaths, '--output-mode=TCP'], { cwd })
  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')
  p.stdout?.on('data', (chunk: string) => {
    console.log(chunk)
  })
  p.stderr?.on('data', (chunk: string) => {
    console.log(chunk)
  })

  const buffers: Buffer[] = []
  server.on('connection', (socket) => {
    socket.on('data', (chunk: Buffer) => {
      buffers.push(chunk)
    })
    socket.on('close', () => {
      server.close()
    })
  })

  const closePromise = new Promise((res) => {
    server.on('close', () => res(true))
  })
  const timeoutPromise = new Promise((res) => setTimeout(() => res(false), timeout))

  const success = (await Promise.race([closePromise, timeoutPromise])) as boolean

  if (!success) {
    p.kill()
    return []
  }

  const exitCode = await new Promise((res) => {
    p.on('exit', (code) => {
      res(code)
    })
  })

  if (exitCode && exitCode !== 0) {
    throw new Error(`failed to extract TypeInfos from files: ${dllPaths}`)
  }

  const raw = buffers.map((buff) => buff.toString('utf-8')).join('')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
