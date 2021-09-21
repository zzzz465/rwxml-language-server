import * as semver from 'semver'
import { execSync } from 'child_process'
import * as vscode from 'vscode'

const dotnetName = getDotnetName()

function getDotnetName() {
  switch (process.platform) {
    case 'win32':
      return '.NET Framework'

    case 'darwin':
    case 'linux':
      return 'Mono (.NET Framework for Linux/OS X)'
  }

  return
}

export function checkTypeInfoAnalyzeAvailable() {
  if (!dotnetAvailable()) {
    promptDotnetInstall()
  }
}

async function promptDotnetInstall() {
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

function dotnetAvailable() {
  const version = getDotnetVersion()
  if (version) {
    console.log(`dotnet version: ${version}`)
    return true
  } else {
    return false
  }
}

function getDotnetVersion(): semver.SemVer | undefined {
  switch (process.platform) {
    case 'win32':
      return getDotnetVersionWindows()

    case 'linux':
      return getDotnetVersionLinux()

    case 'darwin':
      return getDotnetVersionOSX()

    default:
      return
  }
}

function getDotnetVersionWindows() {
  // windows has \r\n, need .trim()
  const stdout = execSync('dotnet --version', { encoding: 'utf-8' }).trim()
  return semver.parse(stdout) ?? undefined
}

function getDotnetVersionLinux() {
  return undefined
}

function getDotnetVersionOSX() {
  return undefined
}
