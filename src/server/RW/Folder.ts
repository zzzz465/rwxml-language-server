import { filter, makeRe, match } from 'minimatch'
import { relative, basename, dirname, extname } from 'path'
import { URI } from 'vscode-uri'
import { isSubPath } from '../utils/paths'

export class File {
	readonly type = 'File'
	basename: string
	constructor(public readonly Uri: URI) {
		this.basename = basename(Uri.fsPath)
	}
}

class DirectoryBase {
	protected _files: (File | DirectoryBase)[] = []

	Search(): void {

	}

	/**
	 * 
	 * @param relativePath relativePath starting from root folder
	 * @param create create a directory corresponding to the relativePath
	 */
	GetDirectory(relativePath: string, create?: boolean): Directory | undefined {
		const paths = relativePath.split('/')
	}

	private _GetDirectory(path: string, create?: boolean): Directory {
		this._files.find()
	}
}

export class Directory extends DirectoryBase {
	readonly type = 'Directory'
	constructor(public readonly Uri: URI) {
		super()
	}

	/**
	 * search directory/folder
	 * @param pattern glob pattern
	 */
	// 이거 없어도 되는게 아닐까?
	/*
	Search(pattern: string): (File | Directory)[] {
		const result: (File|Directory)[] = []
		this._Search(pattern, result)

		return result
	}
	private _Search(pattern: string, output: (File|Directory)[]): void {
		for (const obj of this._files) {
			if (obj.type === 'Directory') {

			} else {
				if (match())
			}
		}
	}
	*/
}

export class RootDirectory extends DirectoryBase {
	readonly type = 'RootDirectory'
	private _roots = new Set<string>()

	/**
	 * @param Roots array of fsPath
	 */
	constructor() {
		super()
	}

	AddRoot(fsPath: string): void {
		this._roots.add(fsPath)
	}

	Add(file: File): void {
		const relatedRoot = this.GetRelatedRoot(file)
		if (relatedRoot) {
			const relativePath = relative(relatedRoot.fsPath, file.Uri.fsPath)
		}
	}

	Delete(file: File): void {

	}

	private isRelatedFile(file: File): boolean {
		const relatedRoot = this.GetRelatedRoot(file)
		return !!relatedRoot
	}

	private GetRelatedRoot(file: File): URI | null {
		for (const fsPath of this._roots.values()) {
			const parent = URI.file(fsPath)
			if (isSubPath(parent, file.Uri))
				return parent
		}

		return null
	}
}