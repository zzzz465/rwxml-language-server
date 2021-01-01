import { assert } from 'console'
import { filter, makeRe, match } from 'minimatch'
import * as Path from 'path'
import { URI } from 'vscode-uri'
import _ from 'lodash'

const seperator = '/' // URI class use '/' as a seperator (platform independent)

function toFirstLetterUppercase(input: string): string {
	return input.charAt(0).toUpperCase().concat(input.slice(1))
}

export class File {
	readonly type = 'File'
	readonly path: Path.ParsedPath
	/**
	 * rimworld's file system is not case-sensitive, so we have to store this manually
	 */
	readonly name: string
	constructor(public readonly Uri: URI) {
		this.path = Path.parse(Uri.fsPath)
		this.name = toFirstLetterUppercase(this.path.name)
	}

	toString(): string {
		return `name: ${this.name}, path: ${this.path}`
	}
}

function isSubPath(parent: string, child: string): boolean {
	return !Path.relative(parent, child).startsWith('..')
}

export class Directory {
	readonly type = 'Directory'
	// usually few file exists in here so no problem with array (I hope)
	protected _files: File[] = []
	protected _directories: Directory[] = []
	readonly name: string

	readonly path: Path.ParsedPath
	constructor(public readonly Uri: URI) {
		this.path = Path.parse(Uri.fsPath)
		this.name = toFirstLetterUppercase(this.path.name)
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
				this._directories.push(obj)
				break
		}
	}

	Delete(obj: File | Directory): void {
		if (obj instanceof File)
			_.remove(this._files, f => f.Uri.path === obj.Uri.path)
		else
			_.remove(this._directories, d => d.Uri.path === obj.Uri.path)
	}

	Get(pattern: RegExp): File | Directory | undefined {
		return this._directories.find(d => !!pattern.exec(d.name)) || this._files.find(d => !!pattern.exec(d.name))
	}

	toString(): string {
		return `name: ${this.name}, path: ${this.path}`
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
				.split(Path.sep).map(d => toFirstLetterUppercase(d)) // paths without last basename
			let dir = this.rootDir
			for (const path of paths) {
				if (path === '.') continue

				const obj = dir.Get(new RegExp(path, 'i'))
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
				.split(Path.sep).map(d => toFirstLetterUppercase(d)) // paths without last basename
			let dir = this.rootDir
			for (const path of paths) {
				const obj = dir.Get(new RegExp(path, 'i'))
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
	Find(dirPath: string, name: RegExp): File | Directory | undefined {
		const dirs = dirPath.split('/').map(d => new RegExp(d, 'i')) // rimworld's filesystem is not case-sensitive
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