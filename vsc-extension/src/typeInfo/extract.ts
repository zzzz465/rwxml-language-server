import { execFile } from 'child_process'
import { createConnection, createServer } from 'net'
import { container } from 'tsyringe'
import { ExtensionContext } from 'vscode'
import * as path from 'path'
import { RimWorldDLLDirectoryKey } from '../containerVars'

function getExtractorDirectory() {
  const path = process.env.EXTRACTOR_PATH
  if (path) {
    return path
  } else {
    throw new Error(`file: ${path} is not a valid extractor.`)
  }
}

function getCWD() {
  const extensionContext = container.resolve<ExtensionContext>('ExtensionContext')
  const cwd = extensionContext.asAbsolutePath(getExtractorDirectory())

  return cwd
}

function initExtractorProcess(dllPaths: string[]) {
  const cwd = getCWD()
  const dllPath = container.resolve<string>(RimWorldDLLDirectoryKey)

  const process = execFile('extractor.exe', [dllPath, ...dllPaths, '--output-mode=TCP'], { cwd })
  process.stdout?.setEncoding('utf-8')
  process.stderr?.setEncoding('utf-8')

  process.stdout?.on('data', console.log)
  process.stderr?.on('data', console.error)

  return process
}

const timeout = 30000 // 30 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[]> {
  const server = createServer()
  server.listen(9870, '127.0.0.1')

  const process = initExtractorProcess(dllPaths)

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
    server.on('close', () => {
      res(true)
    })
  })
  const timeoutPromise = new Promise((res) =>
    setTimeout(() => {
      res(false)
    }, timeout)
  )
  const exitPromise = new Promise((res) => {
    process.on('exit', (code) => {
      res(code)
    })
  })

  const result = (await Promise.race([closePromise, timeoutPromise, exitPromise])) as
    | number
    | null
    | boolean
    | undefined

  if ((typeof result === 'number' && result !== 0) || (typeof result === 'boolean' && !result)) {
    if (!process.killed) {
      process.kill()
    }

    throw new Error(`failed to extract TypeInfos on Runtime, files: ${dllPaths}`)
  }

  const raw = Buffer.concat(buffers).toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
