import { RequestType, Range } from 'vscode-languageserver';
import { URILike } from './common';

export interface DecoRequestParams {
	document: {
		uri: URILike
	}
}

export interface DecoItem {
	range: Range,
	type: DecoType
}

export interface ImageDecoItem extends DecoItem {
	/** valid uri starts with file:/ */
	uri: string
}

export interface DecoRequestRespond {
	document: {
		uri: URILike
	}
	items: DecoItem[]
}

// content_ -> text inside node
// node_ -> text inside < >
// invalid_ -> node that doesn't have typeInfo
export const enum DecoType {
	invalid_node_tag,
	node_tag,
	node_attrName,
	node_attrValue,
	content_Enum, //
	content_defName, //
	content_integer,
	content_float,
	content_boolean,
	content_color,
	content_image
}

export const DecoRequestType = new RequestType<DecoRequestParams, DecoRequestRespond, void>('rwxml/request/decoration')