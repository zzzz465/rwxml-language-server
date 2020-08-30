import { ConfigDatum, LoadFolders, ConfigChangedNotificationType } from '../common/config'
import { IConnection } from 'vscode-languageserver'

export class Config implements ConfigDatum {
	folders: { [version: string]: LoadFolders }
	constructor() {
		this.folders = {}
	}
	setDatum (datum: ConfigDatum): void {
		Object.assign(this, datum)
	}

	listen (connection: IConnection): void {
		connection.onNotification(ConfigChangedNotificationType, configDatum => {
			
		})
	}
}