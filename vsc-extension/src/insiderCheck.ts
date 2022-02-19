import * as vscode from 'vscode'

export default async function checkInsider() {
  const insiderId = 'madeline.rwxml-language-server-insider'
  const search = 'rwxml'

  const insiderExtension = vscode.extensions.getExtension(insiderId)
  if (insiderExtension === undefined) {
    return
  }

  const res = await vscode.window.showInformationMessage(
    'RWXML: insider version is now deprecated. Please remove the insider version.',
    'Remove Insider Version',
    'No Thanks'
  )

  if (res === 'Remove Insider Version') {
    await vscode.commands.executeCommand('workbench.extensions.search', search)
    await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', insiderId)

    const res2 = await vscode.window.showInformationMessage(
      'RWXML: Insider version removed, Please reload VSCode.',
      {
        modal: false,
      },
      'Reload VSCode',
      'Later'
    )

    if (res2 === 'Reload VSCode') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow')
    } else {
      return
    }
  } else if (res === 'No Thanks') {
    return
  } else {
    // user canceled it
    return
  }
}
