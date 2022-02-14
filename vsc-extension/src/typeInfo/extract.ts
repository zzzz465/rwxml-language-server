import { execFile, ChildProcess } from 'child_process'
import { createServer } from 'net'
import { container } from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { RimWorldDLLDirectoryKey } from '../containerVars'

function getExtractorDirectory() {
  let processPath: string | undefined = undefined
  switch (process.platform) {
    case 'win32':
      processPath = process.env.EXTRACTOR_PATH_WIN32
      break

    case 'darwin':
    case 'linux':
      processPath = process.env.EXTRACTOR_PATH_LINUX
      break
  }

  if (processPath) {
    return processPath
  } else {
    throw new Error(`file: ${processPath} is not a valid extractor.`)
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

  let p: ChildProcess
  if (process.platform === 'win32') {
    p = execFile('extractor.exe', [dllPath, ...dllPaths, '--output-mode=TCP'], { cwd })
  } else {
    p = execFile('mono', ['extractor.exe', dllPath, ...dllPaths, '--output-mode=TCP'], { cwd })
  }

  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')

  p.stdout?.on('data', console.log)
  p.stderr?.on('data', console.error)

  return p
}

const timeout = 30000 // 30 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[]> {
  const server = createServer()
  server.listen(9870, '127.0.0.1')

  const process = initExtractorProcess(dllPaths)

  const connectionPromise = new Promise<Buffer>((res) => {
    server.on('connection', async (socket) => {
      const buffers: Buffer[] = []

      socket.on('data', (chunk) => {
        buffers.push(chunk)
      })

      socket.on('close', () => {
        const buffer = Buffer.concat(buffers)
        res(buffer)
      })
    })
  })

  const timeoutPromise = new Promise<number>((res) =>
    setTimeout(() => {
      res(-1)
    }, timeout)
  )
  const exitPromise = new Promise<number>((res) => {
    process.on('exit', (code) => {
      res(code ?? 0)
    })
  })

  const exitCode = await Promise.race([timeoutPromise, exitPromise])

  // await new Promise((res) => server.close(res))

  if (exitCode !== 0) {
    if (!process.killed) {
      process.kill()
    }

    server.close()

    throw new Error(`failed to extract TypeInfos on runtime, files: ${JSON.stringify(dllPaths, null, 2)}`)
  }

  const result = await connectionPromise
  server.close()

  const raw = result.toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
