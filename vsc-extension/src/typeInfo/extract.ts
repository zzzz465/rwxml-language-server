import { execFile, ChildProcess } from 'child_process'
import _ from 'lodash'
import { createServer } from 'net'
import { container } from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { RimWorldDLLDirectoryKey } from '../containerVars'
import { ExtensionContextToken } from '../extension'

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
  const extensionContext = container.resolve<ExtensionContext>(ExtensionContextToken)
  const cwd = extensionContext.asAbsolutePath(getExtractorDirectory())

  return cwd
}

function initExtractorProcess(dllPaths: string[], options?: { port: number }) {
  const cwd = getCWD()
  const dllPath = container.resolve<string>(RimWorldDLLDirectoryKey)
  const port = options?.port ?? 9870

  let p: ChildProcess
  if (process.platform === 'win32') {
    p = execFile('extractor.exe', [dllPath, ...dllPaths, '--output-mode=TCP', `--port=${port}`], { cwd })
  } else {
    p = execFile('mono', ['extractor.exe', dllPath, ...dllPaths, '--output-mode=TCP', `--port=${port}`], { cwd })
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
  const port = _.random(10000, 20000)
  console.log(`server listening on 127.0.0.1:${port}`)
  server.listen(port, '127.0.0.1')

  const process = initExtractorProcess(dllPaths, { port })

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

    throw new Error(`exit code: ${exitCode}`)
  }

  const result = await connectionPromise
  server.close()

  const raw = result.toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
