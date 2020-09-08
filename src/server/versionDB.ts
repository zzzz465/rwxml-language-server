import { TypeInfoMap, TypeInfoInjector } from '../common/TypeInfo';
import { URILike } from '../common/common';

// TODO - rename this, please
/** collections of object that related to typeInfo or file, etc... */
export interface versionDB {
	typeInfoMap: TypeInfoMap
	injector: TypeInfoInjector
	/** Set of Uri that contain textures of the project. */
	textureFileSet: Set<URILike>
}