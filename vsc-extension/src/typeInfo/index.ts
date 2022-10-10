import { execSync } from 'child_process'
import * as semver from 'semver'
import { container } from 'tsyringe'
import * as vscode from 'vscode'
export * from './extract'

const dotnetName = getDotnetName()

function getDotnetName(): string | null {
  switch (process.platform) {
    case 'win32':
      return '.NET Framework'

    case 'darwin':
    case 'linux':
      return 'Mono (.NET Framework for Linux/OS X)'

    default:
      return null
  }
}

export function checkTypeInfoAnalyzeAvailable(): boolean {
  const available = dotnetAvailable()
  container.register('DOTNET_AVAILABLE', { useValue: available })

  if (!available) {
    promptDotnetInstall()
  }

  return available
}

async function promptDotnetInstall(): Promise<void> {
  if (dotnetName) {
    const message = `\
${dotnetName} is not installed. to enable Runtime TypeInfo Extraction, you must have ${dotnetName} with version higher than 4.0.\
`
    const selection = await vscode.window.showInformationMessage(message)
  } else {
    const message = `\
platform ${process.platform} cannot use Runtime TypeInfo Extraction, only RimWorld Core types will be used.\
`
    vscode.window.showInformationMessage(message)
  }
}

function dotnetAvailable(): boolean {
  switch (process.platform) {
    case 'win32':
      return !!getDotnetVersionWindows()

    case 'linux':
      return !!getDotnetVersionLinux()

    case 'darwin':
      return !!getDotnetVersionOSX()

    default:
      return false
  }
}

function getDotnetVersionWindows(): semver.SemVer | undefined {
  // windows has \r\n, need .trim()
  const stdout = execSync('dotnet --version', { encoding: 'utf-8' }).trim()
  return semver.parse(stdout) ?? undefined
}

function getDotnetVersionLinux(): string {
  const stdout = execSync('mono --version', { encoding: 'utf-8' }).trim()
  return stdout ?? undefined
}

function getDotnetVersionOSX(): string {
  const stdout = execSync('mono --version', { encoding: 'utf-8' }).trim()
  return stdout ?? undefined
}
