import { TypeInfoMap, TypeInfoInjector } from '../common/TypeInfo';
import { URILike } from '../common/common';

// TODO - rename this, please
export interface typeDB {
	typeInfoMap: TypeInfoMap
	injector: TypeInfoInjector
	/** Set of Uri that contain textures of the project. */
	textureFileSet: Set<URILike>
}