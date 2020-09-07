import { disposeWatchFileRequestType, disposeResult, WatchFileRequestType, WatchFileRequestParams, WatchFileAddedNotificationType, WatchFileChangedNotificationType, WatchFileDeletedNotificationType } from '../common/fileWatcher'
import { LanguageClient, VersionedTextDocumentIdentifier } from 'vscode-languageclient';
import { GlobPattern, FileSystemWatcher, workspace, RelativePattern } from 'vscode';
const { createFileSystemWatcher, findFiles } = workspace
import { ConfigDatum } from '../common/config';
import { Event } from '../common/event';
import { Uri } from 'vscode'
import watch from 'node-watch'
import { DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../common/Defs';
import { readFile } from 'fs';

export class ProjectWatcher {
	private watchers: Map<GlobPattern, FileSystemWatcher>
	private client: LanguageClient
	private disposeEvent: Event<void>
	constructor(client: LanguageClient) {
		this.watchers = new Map()
		this.client = client
		this.disposeEvent = new Event<void>()
	}

	watch(config: ConfigDatum): void {
		this.disposeEvent.Invoke()
		this.disposeEvent = new Event<void>()
		for (const [version, obj] of Object.entries(config.folders)) {
			if (obj.Defs) {
				const defPath = Uri.parse(obj.Defs).fsPath
				const defWatcher = watch(defPath,
					{ recursive: true, filter: /\.xml$/ },
					(event, filename) => this.updateHandler(event, filename, version))

				this.disposeEvent.subscribe({}, () => defWatcher.close())
			}
		}
	}

	private updateHandler(event: 'update' | 'remove', filename: string, version: string) {
		const uriPath = Uri.file(filename).toString()
		switch (event) {
			case 'update': {
				readFile(filename, (err, data) => {
					if (err) return
					const text = data.toString()
					this.client.sendNotification(DefFileChangedNotificationType, {
						version,
						files: {
							uriPath: text
						}
					})
				})
			}
				break
			case 'remove': {
				this.client.sendNotification(DefFileRemovedNotificationType, uriPath)
			}
				break
		}
	}
}