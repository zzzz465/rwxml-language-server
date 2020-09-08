import { LanguageClient } from 'vscode-languageclient';
import { ConfigDatum } from '../common/config';
import { Event } from '../common/event';
import { Uri } from 'vscode'
import watch from 'node-watch'
import { DefFileChangedNotificationType, DefFileRemovedNotificationType } from '../common/Defs';
import { readFile } from 'fs';
import { TextureChangedNotificaionType, TextureRemovedNotificationType } from '../common/textures';

export class ProjectWatcher {
	private client: LanguageClient
	private disposeEvent: Event<void>
	constructor(client: LanguageClient) {
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
					(event, filename) => this.defHandler(event, filename, version))

				this.disposeEvent.subscribe({}, () => defWatcher.close())
			}

			if (obj.Textures) {
				const texturesPath = Uri.parse(obj.Textures).fsPath
				const textureWatcher = watch(texturesPath,
					{ recursive: true, filter: /\.((png)|(jpg)|(jpeg)|(gif))$/ },
					(event, filename) => this.texHandler(event, filename, version))
				this.disposeEvent.subscribe({}, () => textureWatcher.close())
			}
		}
	}

	private defHandler(event: 'update' | 'remove', filename: string, version: string) {
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
				break
			}
			case 'remove': {
				this.client.sendNotification(DefFileRemovedNotificationType, uriPath)
				break
			}
		}
	}

	private texHandler(event: 'update' | 'remove', filename: string, version: string) {
		const uriPath = Uri.file(filename).toString()
		switch (event) {
			case 'update': {
				this.client.sendNotification(TextureChangedNotificaionType, {
					files: [uriPath],
					version
				})
				break
			}

			case 'remove': {
				this.client.sendNotification(TextureRemovedNotificationType, {
					files: [uriPath],
					version
				})
				break
			}
		}
	}
}