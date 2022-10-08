import { spawn } from 'child_process'
import _ from 'lodash'
import { createServer } from 'net'
import * as tsyringe from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { ExtensionContextToken } from '../extension'
import defaultLogger from '../log'
import { ExtractionError } from './error'

// TODO: refactor this code.

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
  const extensionContext = tsyringe.container.resolve<ExtensionContext>(ExtensionContextToken)
  const cwd = extensionContext.asAbsolutePath(getExtractorDirectory())

  return cwd
}

const extractorCmd = (() => {
  switch (process.platform) {
    case 'win32':
      return 'extractor.exe'

    case 'darwin':
      return 'mono'

    default:
      return ''
  }
})()

function buildExtractorArgs(dllPaths: string[], port = 9870): string[] {
  return [...dllPaths, '--output-mode=TCP', `--port=${port}`]
}

function commandToString(cmd: string, args: string[]): string {
  return `${cmd} ${args.map((v) => `"${v}"`).join(' ')}`
}

function initExtractorProcess(dllPaths: string[], options?: { port: number }) {
  const cwd = getCWD()
  const port = options?.port ?? 9870

  const args = buildExtractorArgs(dllPaths, port)
  defaultLogger().silly(`executing process: ${commandToString(extractorCmd, args)}`)

  const p = spawn(extractorCmd, args, { cwd })
  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')
  p.stdout?.on('data', (data) => {
    defaultLogger().info(String(data).trim())
  })
  p.stderr?.on('data', (data) => {
    defaultLogger().error(String(data).trim())
  })

  return p
}

const timeout = 60000 // 60 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[]> {
  const server = createServer()
  const port = _.random(10000, 20000)
  defaultLogger().silly(`server listening on 127.0.0.1:${port}`)
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

    throw new ExtractionError(`exit code: ${exitCode}`, commandToString(extractorCmd, buildExtractorArgs(dllPaths)))
  }

  const result = await connectionPromise
  server.close()

  const raw = result.toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
