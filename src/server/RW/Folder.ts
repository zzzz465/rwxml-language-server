import { assert } from 'console'
import { filter, makeRe, match } from 'minimatch'
import * as Path from 'path'
import { URI } from 'vscode-uri'

const seperator = '/' // URI class use '/' as a seperator (platform independent)

export class File {
	readonly type = 'File'
	readonly path: Path.ParsedPath
	constructor(public readonly Uri: URI) {
		this.path = Path.parse(Uri.fsPath)
	}
}

function isSubPath(parent: string, child: string): boolean {
	return !Path.relative(parent, child).startsWith('..')
}

export class Directory {
	readonly type = 'Directory'
	// usually few file exists in here so no problem with array (I hope)
	protected _files: File[] = []
	protected _directories = new Map<string, Directory>()

	readonly path: Path.ParsedPath
	constructor(public readonly Uri: URI) {
		this.path = Path.parse(Uri.fsPath)
	}

	/**
	 * @param relativePath relativePath from this directory
	 * @param obj object to be added
	 */
	Add(obj: File | Directory): void {
		switch (obj.type) {
			case 'File':
				this._files.push(obj)
				break

			case 'Directory':
				this._directories.set(obj.path.name, obj)
				break
		}
	}

	Delete(obj: File | Directory): void {
		this._files = this._files.filter(f => !f.path.name)
		this._directories.delete(obj.path.name)
	}

	Get(pattern: string | RegExp): File | Directory | undefined {
		if (pattern instanceof RegExp)
			return [...this._directories.values()].find(d => !!pattern.exec(d.path.name)) || this._files.find(d => pattern.exec(d.path.name))
		else
			return this._directories.get(pattern) || this._files.find(d => d.path.name === pattern)
	}
}

export class RootDirectory {
	private _roots: URI[] = [] // fsPath[]
	private rootDir = new Directory(URI.file('/'))

	constructor() {
	}

	AddRoot(uri: URI): void {
		this._roots.push(uri)
	}

	/**
	 * 
	 * @param relativePath ignored value
	 * @param file 
	 */
	Add(file: File): void { // file should have ext?
		const root = this.GetRelatedRoot(file.Uri)
		if (root) {
			// get directory that contains file
			const paths = Path.dirname(Path.relative(root.path, file.Uri.path))
				.split(Path.sep) // paths without last basename
			let dir = this.rootDir
			for (const path of paths) {
				const obj = dir.Get(path)
				if (obj?.type === 'Directory') {
					dir = obj
				} else { // directory is not exist
					const newUri = dir == this.rootDir ?
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
		const root = this.GetRelatedRoot(file.Uri)
		if (root) {
			// get directory that contains file
			const paths = Path.dirname(Path.relative(root.fsPath, file.Uri.fsPath))
				.split(Path.sep) // paths without last basename
			let dir = this.rootDir
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

	/**
	 * 
	 * @param path relative path starting from Textures root
	 */
	Find(dirPath: string, name: string | RegExp): File | Directory | undefined {
		const dirs = dirPath.split('/')
		let dir = this.rootDir
		for (const path of dirs) {
			const res = dir.Get(path)
			if (res?.type === 'Directory')
				dir = res
			else
				return undefined
		}

		return dir.Get(name)
	}

	private isRelatedFile(file: File): boolean {
		const relatedRoot = this.GetRelatedRoot(file.Uri)
		return !!relatedRoot
	}

	private GetRelatedRoot(uri: URI): URI | null {
		for (const parent of this._roots.values()) {
			if (isSubPath(parent.path, uri.path))
				return parent
		}

		return null
	}
}