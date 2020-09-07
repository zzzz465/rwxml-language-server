/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createScanner, TokenType } from './XMLScanner';
import { findFirst } from '../utils/arrays';
// import { isVoidElement } from '../languageFacts/fact';

export class Node {
	public document?: XMLDocument
	public tag: string | undefined;
	public closed = false; // is validate closed? ex) <tag></tag>
	public startTagEnd: number | undefined;
	public endTagStart: number | undefined;
	public attributes: { [name: string]: string | null } | undefined;
	public text?: {
		start: number
		content: string
		end: number
	}
	public get attributeNames(): string[] { return this.attributes ? Object.keys(this.attributes) : []; }
	constructor(public start: number, public end: number, public children: Node[], public parent?: Node) {
	}
	public isSameTag(tagString: string): boolean {
		// return this.tag && tagInLowerCase && this.tag.length === tagInLowerCase.length && this.tag.toLowerCase() === tagInLowerCase;
		return !!this.tag && this.tag === tagString
	}
	public get firstChild(): Node | undefined { return this.children[0]; }
	public get lastChild(): Node | undefined { return this.children.length ? this.children[this.children.length - 1] : void 0; }

	public findNodeBefore(offset: number): Node {
		const idx = findFirst(this.children, c => offset <= c.start) - 1;
		if (idx >= 0) {
			const child = this.children[idx];
			if (offset > child.start) {
				if (offset < child.end) {
					return child.findNodeBefore(offset);
				}
				const lastChild = child.lastChild;
				if (lastChild && lastChild.end === child.end) {
					return child.findNodeBefore(offset);
				}
				return child;
			}
		}
		return this;
	}

	public findNodeAt(offset: number): Node {
		const idx = findFirst(this.children, c => offset <= c.start) - 1;
		if (idx >= 0) {
			const child = this.children[idx];
			if (offset > child.start && offset <= child.end) {
				return child.findNodeAt(offset);
			}
		}
		return this;
	}
}

export interface XMLDocument extends Node {
	rawXmlDefinition: string;
	root?: Node;
	findNodeBefore(offset: number): Node;
	findNodeAt(offset: number): Node;
}

export function parse(text: string): XMLDocument {
	const scanner = createScanner(text, undefined, undefined, true);

	const XMLDocument = new Node(0, text.length, [], void 0) as XMLDocument;
	XMLDocument.document = XMLDocument
	let curr = XMLDocument as Node;
	let endTagStart = -1;
	let endTagName: string | null = null;
	let pendingAttribute: string | null = null;
	let token = scanner.scan();
	while (token !== TokenType.EOS) {
		switch (token) {
			case TokenType.XMLDeclaration: {
				const raw = scanner.getTokenText();
				XMLDocument.rawXmlDefinition = raw;
				break;
			}
			case TokenType.StartTagOpen: {
				const child = new Node(scanner.getTokenOffset(), text.length, [], curr);
				child.document = XMLDocument
				curr.children.push(child);
				curr = child;
				break;
			}
			case TokenType.StartTag:
				curr.tag = scanner.getTokenText();
				break;
			case TokenType.StartTagClose:
				if (curr.parent) {
					curr.end = scanner.getTokenEnd(); // might be later set to end tag position
					if (scanner.getTokenLength()) { // why?
						curr.startTagEnd = scanner.getTokenEnd();
						// if (curr.tag && isVoidElement(curr.tag)) {
						/*
						if (curr.tag) { // 다른데로 옮겨야함
							curr.closed = true;
							curr = curr.parent; 
						}
						*/
					} else {
						// pseudo close token from an incomplete start tag
						// curr = curr.parent;
					}
				}
				break;
			case TokenType.StartTagSelfClose:
				if (curr.parent) {
					curr.closed = true;
					curr.end = scanner.getTokenEnd();
					curr.startTagEnd = scanner.getTokenEnd();
					curr = curr.parent;
				}
				break;
			case TokenType.EndTagOpen:
				endTagStart = scanner.getTokenOffset();
				endTagName = null;
				break;
			case TokenType.EndTag:
				// endTagName = scanner.getTokenText().toLowerCase();
				endTagName = scanner.getTokenText();
				break;
			case TokenType.EndTagClose:
				if (endTagName) {
					let node = curr;
					// see if we can find a matching 
					while (!node.isSameTag(endTagName) && node.parent) {
						node = node.parent;
					}
					if (node.parent) { // match
						
						while (curr !== node) {
							curr.end = endTagStart;
							curr.closed = false;
							curr = curr.parent!;
						}
						
						curr.closed = true;
						curr.endTagStart = endTagStart;
						curr.end = scanner.getTokenEnd();
						curr = curr.parent!;
					} else {
						// ignore closing tag </tag>
					}
				}
				break;
			case TokenType.AttributeName: {
				pendingAttribute = scanner.getTokenText();
				let attributes = curr.attributes;
				if (!attributes) {
					curr.attributes = attributes = {};
				}
				attributes[pendingAttribute] = null; // Support valueless attributes such as 'checked'
				break;
			}
			case TokenType.AttributeValue: {
				let value = scanner.getTokenText();
				if (value.length >= 2)
					value = value.substring(1, value.length - 1) // remove encapsuling text '' or ""
				const attributes = curr.attributes;
				if (attributes && pendingAttribute) {
					attributes[pendingAttribute] = value;
					pendingAttribute = null;
				}
				break;
			}
			case TokenType.Content: {
				curr.text = {
					start: scanner.getTokenOffset(),
					content: scanner.getTokenText(),
					end: scanner.getTokenEnd()
				}
				break;
			}
		}
		token = scanner.scan();
	}

	const queue: Node[] = [XMLDocument]
	while (queue.length > 0) { // node that have children can't have text value
		const item = queue.pop()! // so it removes them
		if(item.children.length > 0) {
			delete item.text
			queue.push(...item.children)
		}
	}

	if(XMLDocument.children.length > 0)
		XMLDocument.root = XMLDocument.children[0]
	
	// root에 대해서, XML 선언 + root 재조정
	return XMLDocument;
	/*
	return {
		root: XMLDocument,
		findNodeBefore: XMLDocument.findNodeBefore.bind(XMLDocument),
		findNodeAt: XMLDocument.findNodeAt.bind(XMLDocument)
	};
	*/
}