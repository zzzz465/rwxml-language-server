import { disposeWatchFileRequestType, disposeResult, WatchFileRequestType, WatchFileRequestParams, WatchFileAddedNotificationType, WatchFileChangedNotificationType, WatchFileDeletedNotificationType } from '../common/fileWatcher'
import { LanguageClient } from 'vscode-languageclient';
import { GlobPattern, FileSystemWatcher, workspace, RelativePattern } from 'vscode';
const { createFileSystemWatcher, findFiles } = workspace
import { URI } from 'vscode-uri';
import { URILike } from '../common/common'

export class FileWatcher {
	private watchers: Map<GlobPattern, FileSystemWatcher>
	private connection?: LanguageClient
	constructor() {
		this.watchers = new Map()
	}

	/** listen watchFile events, should be called after the client is ready */
	listen(connection: LanguageClient): void {
		this.connection = connection
		// somehow in "onRequest", callback's this is fixed to "undefined", so we can't pass binded function, use lambda instead.
		connection.onRequest(WatchFileRequestType, (req) => this.watchHandler(req))
		connection.onRequest(disposeWatchFileRequestType, (req) => this.disposeHandler(req))
	}

	private async watchHandler(request: WatchFileRequestParams): Promise<URILike[]> {
		const pattern = new RelativePattern(request.basePath, request.globPattern)
		const files = await findFiles(pattern)
		const new_watcher = createFileSystemWatcher(pattern)

		new_watcher.onDidCreate(uri => {
			if (this.connection)
				this.connection.sendNotification(WatchFileAddedNotificationType, uri.toString())
		})
		new_watcher.onDidChange(uri => {
			if (this.connection)
				this.connection.sendNotification(WatchFileChangedNotificationType, uri.toString())
		})
		new_watcher.onDidDelete(uri => {
			if (this.connection)
				this.connection.sendNotification(WatchFileDeletedNotificationType, uri.toString())
		})

		this.watchers.set(pattern, new_watcher)

		return files.map(uri => uri.toString())
	}

	private disposeHandler(request: WatchFileRequestParams): disposeResult {
		const pattern = new RelativePattern(request.basePath, request.globPattern)
		if (!(this.watchers.has(pattern)))
			return 'notExist'
		else {
			this.watchers.delete(pattern)
			return 'success'
		}
	}
}