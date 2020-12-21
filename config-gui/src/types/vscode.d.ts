import { type } from 'os'
import Vue from 'vue'

declare global {
	interface vscode {
		postMessage(message: any): unknown
	}
	interface OpenDialogOptions {
		
	}
	function acquireVsCodeApi(): vscode
}

declare module 'vue/types/vue' {
	interface Vue {
		$vscode: vscode
		$window: EventTarget
	}
}
