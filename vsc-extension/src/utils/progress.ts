import * as vscode from 'vscode'

export async function createProgress(options: Omit<vscode.ProgressOptions, 'cancellable'>) {
  // resolve will be assigned immediately after making a new Promise
  // https://stackoverflow.com/questions/42118900/when-is-the-body-of-a-promise-executed
  let resolve: (value: void | PromiseLike<void>) => void = null as any

  const promise = new Promise<void>((res) => {
    resolve = res
  })

  let progress: vscode.Progress<{ message?: string; increment?: number }> = null as any

  vscode.window.withProgress({ ...options, cancellable: false }, (p) => {
    progress = p
    return promise
  })

  return { resolve, progress }
}
