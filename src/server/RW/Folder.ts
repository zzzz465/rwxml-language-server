import { assert } from 'console'
import { filter, makeRe, match } from 'minimatch'
import * as Path from 'path'
import { URI } from 'vscode-uri'

const seperator = '/' // URI class use '/' as a seperator (platform independent)

export class File {
	readonly type = 'File'
	readonly baseName: string
	constructor(public readonly Uri: URI) {
		this.baseName = Path.basename(Uri.fsPath)
	}
}

function isSubPath(parent: string, child: string): boolean {
	return !Path.relative(parent, child).startsWith('..')
}

export class Directory {
	readonly type = 'Directory'
	protected _files = new Map<string, File>()
	protected _directories = new Map<string, Directory>()

	readonly baseName: string
	constructor(public readonly Uri: URI) {
		this.baseName = Path.basename(Uri.fsPath)
	}

	/**
	 * @param relativePath relativePath from this directory
	 * @param obj object to be added
	 */
	Add(obj: File | Directory): void {
		switch (obj.type) {
			case 'File':
				this._files.set(obj.baseName, obj)
				break

			case 'Directory':
				this._directories.set(obj.baseName, obj)
				break
		}
	}

	Delete(obj: File | Directory): void {
		this._files.delete(obj.baseName)
		this._directories.delete(obj.baseName)
	}

	Get(name: string): File | Directory | undefined {
		return this._directories.get(name) || this._files.get(name)
	}
}

export class RootDirectory {
	private _roots = new Set<string>() // fsPath[]
	private root = new Directory(URI.file('/'))

	constructor() {
	}

	AddRoot(fsPath: string): void {
		this._roots.add(fsPath)
	}

	/**
	 * 
	 * @param relativePath ignored value
	 * @param file 
	 */
	Add(file: File): void { // file should have ext?
		const root = this.GetRelatedRoot(file.Uri.fsPath)
		if (root) {
			// get directory that contains file
			const paths = Path.dirname(Path.relative(root.fsPath, file.Uri.fsPath))
				.split(Path.sep) // paths without last basename
			let dir = this.root
			for (const path of paths) {
				const obj = dir.Get(path)
				if (obj?.type === 'Directory') {
					dir = obj
				} else { // directory is not exist
					const newUri = dir == this.root ?
						URI.file(Path.join(root.fsPath, path)) :
						URI.file(Path.join(dir.Uri.fsPath, path))

					const newDir = new Directory(newUri)
					dir.Add(newDir)
					dir = newDir
				}
			}

			// add file to directory
			dir.Add(file)
		}
	}

	Delete(file: File): void {
		const root = this.GetRelatedRoot(file.Uri.fsPath)
		if (root) {
			// get directory that contains file
			const paths = Path.dirname(Path.relative(root.fsPath, file.Uri.fsPath))
				.split(Path.sep) // paths without last basename
			let dir = this.root
			for (const path of paths) {
				const obj = dir.Get(path)
				if (obj?.type === 'Directory')
					dir = obj
				else
					return
			}

			dir.Delete(file)
		}
	}

	private isRelatedFile(file: File): boolean {
		const relatedRoot = this.GetRelatedRoot(file.Uri.fsPath)
		return !!relatedRoot
	}

	private GetRelatedRoot(path: string): URI | null {
		for (const fsPath of this._roots.values()) {
			const parent = URI.file(fsPath)
			if (isSubPath(parent.fsPath, path))
				return parent
		}

		return null
	}
}