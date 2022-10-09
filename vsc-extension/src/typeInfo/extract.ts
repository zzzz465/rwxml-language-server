import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import _ from 'lodash'
import { createServer } from 'net'
import ono from 'ono'
import { Err, Ok, Option, Result } from 'oxide.ts/dist'
import * as tsyringe from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { ExtensionContextToken } from '../extension'
import { log } from '../log'
import { ExtractionError } from './error'

// TODO: refactor this code.

function getExtractorDirectory(): Option<string> {
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

  return Option.from(processPath)
}

function getCWD(): Option<string> {
  const extensionContext = tsyringe.container.resolve<ExtensionContext>(ExtensionContextToken)
  const cwd = getExtractorDirectory().map(extensionContext.asAbsolutePath)

  return cwd
}

const getExtractorCommand: () => string | null = () => {
  switch (process.platform) {
    case 'win32':
      return 'extractor.exe'

    case 'darwin':
      return 'mono'

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
): Result<ChildProcessWithoutNullStreams, Error> {
  const cwd = getCWD().unwrapUnchecked()
  if (cwd) {
    return Err(ono(`cannot get cwd`))
  }

  const port = options?.port ?? 9870
  const args = buildExtractorArgs(dllPaths, port)

  log.silly(`executing process: ${commandToString(cmd, args)}`)

  const p = spawn(cmd, args, { cwd })
  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')
  p.stdout?.on('data', (data) => {
    log.info(String(data).trim())
  })
  p.stderr?.on('data', (data) => {
    log.error(String(data).trim())
  })

  return Ok(p)
}

const timeout = 60000 // 60 second
export async function extractTypeInfos(...dllPaths: string[]): Promise<Result<unknown[], Error>> {
  const cmd = getExtractorCommand().unwrapUnchecked()
  if (!cmd) {
    return Err(ono(`cannot get extractor command`))
  }

  const x = getExtractorCommand()

  const server = createServer()
  const port = _.random(10000, 20000)
  log.silly(`server listening on 127.0.0.1:${port}`)
  server.listen(port, '127.0.0.1')

  const process = initExtractorProcess(cmd, dllPaths, { port }).unwrapUnchecked()
  if (process instanceof Error) {
    return Err(ono(process, 'cannot init extractor process'))
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

    return Err(ono(new ExtractionError(`extraction failed with exit code ${exitCode}`)))
  }

  const result = await connectionPromise
  server.close()

  const raw = result.toString('utf-8')
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
