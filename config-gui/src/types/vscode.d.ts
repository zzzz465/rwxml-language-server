import { type } from 'os'
import Vue from 'vue'
import { message } from '@interop/message'

declare global {
	interface vscode {
		postMessage(message: any): unknown
	}
	function acquireVsCodeApi(): vscode
	interface Event {
		data: message
	}
}


declare module 'vue/types/vue' {
	interface Vue {
		$vscode: vscode
		$addEventHandler(handler: EventListener | undefined): void
		$removeEventHandler(handler: EventListener | undefined): void
	}
}
