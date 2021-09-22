import { execFile } from 'child_process'

export function getExtractorPath() {
  const path = process.env.EXTRACTOR_PATH
  if (path) {
    return path
  } else {
    throw new Error(`file: ${path} is not a valid extractor.`)
  }
}

export async function extractTypeInfos(...dllPaths: string[]): Promise<unknown> {
  const path = getExtractorPath()

  const p = execFile(`${path}`, dllPaths)
  const stdoutBuffers: Buffer[] = []
  const stderrBuffers: Buffer[] = []
  let exitCode = 0
  let exited = false
  p.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffers.push(chunk)
  })
  p.stderr?.on('data', (chunk: Buffer) => {
    stderrBuffers.push(chunk)
  })
  p.on('exit', (code) => {
    exited = true
    if (code !== null) {
      exitCode = code
    } else {
      throw new Error(`unexpected code: ${code}, expected number, got ${code}`)
    }
  })

  await new Promise((res) => {
    if (exited) {
      res(undefined)
    }
  })

  if (exitCode !== 0) {
    const err = Buffer.concat(stderrBuffers).toString()
    console.error(`error from extractor: ${err}`)

    throw new Error(`failed to extract TypeInfos from files: ${dllPaths}`)
  }

  const raw = Buffer.concat(stdoutBuffers).toString()
  const typeInfos = JSON.parse(raw)

  return typeInfos
}
