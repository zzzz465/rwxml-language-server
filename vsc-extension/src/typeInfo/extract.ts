import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import _ from 'lodash'
import { createServer } from 'net'
import ono from 'ono'
import * as path from 'path'
import * as tsyringe from 'tsyringe'
import { ExtensionContext } from 'vscode'
import { ExtensionContextToken } from '../extension'
import { log } from '../log'
import { ExtractionError } from './error'

// TODO: refactor this code.

function getExtractorDirectory(): string | null {
  const extensionContext = tsyringe.container.resolve<ExtensionContext>(ExtensionContextToken)
  const fs = require('fs')

  // 这里的日志带上时间戳和版本标识，以便确认代码是否生效
  log.info(`[[ NEW VERSION 1.6.1 ]] Checking Extractor Path...`);
  log.info(`ENV EXTRACTOR_PATH_WIN32: ${process.env.EXTRACTOR_PATH_WIN32}`);

  // 即使有环境变量，也要校验文件是否存在
  if (process.platform === 'win32' && process.env.EXTRACTOR_PATH_WIN32) {
    const envPath = extensionContext.asAbsolutePath(process.env.EXTRACTOR_PATH_WIN32)
    if (fs.existsSync(path.join(envPath, 'extractor.exe'))) {
      return process.env.EXTRACTOR_PATH_WIN32
    }
    log.warn(`[[ ENV INVALID ]] Extractor not found in ENV path: ${envPath}`);
  }

  const candidatePaths = [
    'bin', 
    'extractor/extractor/bin/Debug/net472',
    // 强制使用用户确认的绝对路径作为最高优先级查找
    'D:/RimworldProject/rwxml-language-server-master/extractor/extractor/bin/Debug/net472'
  ]

  for (const p of candidatePaths) {
    const fullPath = p.startsWith('D:') ? p : extensionContext.asAbsolutePath(p)
    const exePath = path.join(fullPath, 'extractor.exe')
    if (fs.existsSync(exePath)) {
      log.info(`[[ SUCCESS ]] Using path: ${exePath}`)
      return p
    }
  }

  return 'bin'
}

function getCWD(): string | null {
  const extensionContext = tsyringe.container.resolve<ExtensionContext>(ExtensionContextToken)
  const extDir = getExtractorDirectory()
  if (!extDir) return null
  
  return extDir.startsWith('D:') ? extDir : extensionContext.asAbsolutePath(extDir)
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

  // Use full path but let spawn handle the quoting/escaping
  const absoluteCmd = path.join(cwd, cmd)

  log.debug(`executing process: ${absoluteCmd} ${args.join(' ')}`)

  // Disable shell: true. It causes more problems with absolute paths than it solves.
  const p = spawn(absoluteCmd, args, { cwd })
  p.stdout?.setEncoding('utf-8')
  p.stderr?.setEncoding('utf-8')
  p.stdout?.on('data', (data) => {
    log.debug(String(data).trim())
  })
  p.stderr?.on('data', (data) => {
    log.error(`Extractor Stderr: ${String(data).trim()}`)
  })

  return p
}

const timeout = 300000 // 300 second (5 minutes)
export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown[] | Error> {
  const cmd = getExtractorName()
  if (!cmd) {
    return ono(`cannot get extractor name`)
  }

  const server = createServer()
  const port = _.random(10000, 20000)
  log.silly(`server listening on 127.0.0.1:${port}`)
  
  try {
    server.listen(port, '127.0.0.1')
  } catch (err) {
    return ono(err as any, 'failed to start TCP server')
  }

  const process = initExtractorProcess(cmd, dllPaths, { port })
  if (process instanceof Error) {
    server.close()
    return ono(process, 'cannot init extractor process')
  }

  const connectionPromise = new Promise<Buffer>((res, rej) => {
    server.on('connection', async (socket) => {
      const buffers: Buffer[] = []

      socket.on('data', (chunk) => {
        buffers.push(chunk)
      })

      socket.on('error', (err) => {
        rej(ono(err, 'Socket error during extraction'))
      })

      socket.on('close', () => {
        const buffer = Buffer.concat(buffers)
        res(buffer)
      })
    })
    
    server.on('error', (err) => {
      rej(ono(err, 'TCP server error during extraction'))
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
    process.on('error', (err) => {
      log.error(`Process spawn error: ${err}`)
      res(-2)
    })
  })

  try {
    const exitCode = await Promise.race([timeoutPromise, exitPromise])

    if (exitCode !== 0) {
      if (!process.killed) {
        process.kill()
      }
      server.close()
      const reason = exitCode === -1 ? 'timeout' : (exitCode === -2 ? 'spawn error' : `exit code ${exitCode}`)
      return ono(new ExtractionError(`extraction failed: ${reason}`))
    }

    const result = await connectionPromise
    server.close()

    const raw = result.toString('utf-8')
    if (!raw) {
      return []
    }
    const typeInfos = JSON.parse(raw)
    return typeInfos
  } catch (err) {
    if (!process.killed) {
      process.kill()
    }
    server.close()
    return ono(err as any, 'Error during type info extraction')
  }
}
