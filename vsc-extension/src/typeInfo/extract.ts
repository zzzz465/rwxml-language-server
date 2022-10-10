import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import _ from 'lodash'
import { createServer } from 'net'
import ono from 'ono'
import * as tsyringe from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { ExtensionContextToken } from '../extension'
import { log } from '../log'
import { ExtractionError } from './error'

// TODO: refactor this code.

function getExtractorDirectory(): string | null {
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

  return processPath ?? null
}

function getCWD(): string | null {
  const extensionContext = tsyringe.container.resolve<ExtensionContext>(ExtensionContextToken)

  const extDir = getExtractorDirectory()
  if (!extDir) {
    return null
  }

  return extensionContext.asAbsolutePath(extDir)
}

function getExtractorName(): string | null {
  switch (process.platform) {
    case 'win32':
      return 'extractor.exe'

    case 'darwin':
    case 'linux':
      return 'extractor'

    default:
      return null
  }
}

function buildExtractorArgs(dllPaths: string[], port = 9870): string[] {
  return [...dllPaths, '--output-mode=TCP', `--port=${port}`]
}

function commandToString(cmd: string, args: string[]): string {
  return `${cmd} ${args.map((v) => `"${v}"`).join(' ')}`
}

function initExtractorProcess(
  cmd: string,
  dllPaths: string[],
  options?: { port: number }
): ChildProcessWithoutNullStreams | Error {
  const cwd = getCWD()
  if (!cwd) {
    return ono(`cannot get cwd`)
  }

  const port = options?.port ?? 9870
  const args = buildExtractorArgs(dllPaths, port)

  log.debug(`executing process: ${commandToString(cmd, args)}`)

  const p = spawn(cmd, args, { cwd })
  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')
  p.stdout?.on('data', (data) => {
    log.debug(String(data).trim())
  })
  p.stderr?.on('data', (data) => {
    log.error(String(data).trim())
  })

  return p
}

const timeout = 60000 // 60 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[] | Error> {
  const cmd = getExtractorName()
  if (!cmd) {
    return ono(`cannot get extractor name`)
  }

  const server = createServer()
  const port = _.random(10000, 20000)
  log.silly(`server listening on 127.0.0.1:${port}`)
  server.listen(port, '127.0.0.1')

  const process = initExtractorProcess(cmd, dllPaths, { port })
  if (process instanceof Error) {
    return ono(process, 'cannot init extractor process')
  }

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
    process.on('exit', (code: any) => {
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

    return ono(new ExtractionError(`extraction failed with exit code ${exitCode}`))
  }

  const result = await connectionPromise
  server.close()

  const raw = result.toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
