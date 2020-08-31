import { ConfigDatum, LoadFolders, ConfigChangedNotificationType } from '../common/config'
import { IConnection } from 'vscode-languageserver'
import { Event, iEvent } from '../common/event'

export interface ConfigChangedEventArgs {
	config: Config
}

export class Config implements ConfigDatum {
	folders: { [version: string]: LoadFolders }
	private _configChanged: Event<ConfigChangedEventArgs>
	constructor() {
		this.folders = {}
		this._configChanged = new Event()
	}

	get configChanged(): iEvent<ConfigChangedEventArgs> {
		return this._configChanged
	}

	setDatum (datum: ConfigDatum): void {
		Object.assign(this, datum)
	}

	listen (connection: IConnection): void {
		connection.onNotification(ConfigChangedNotificationType, configDatum => {
			this.setDatum(configDatum)
		})
	}
}