import {
	RequestType, 
	FileSystemWatcher, 
	NotificationType,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { absPath } from './common';


// P params R result E error
/** uri string that can be parsed with vscode-URI */
export type URILike = string
/** params used for request watch  
 * note that client will use globpatternOnly to check whether the request is same or not.
 */
export interface WatchFileRequestParams extends FileSystemWatcher {
	/** base path for glob pattern, used by vscode.RelativePattern */
	basePath: absPath
}

/** 
 * server -> client, to request type to watch file/folder.  
 * if requested watcher is already exists, the previous one should be disposed.  
 * @returns [URI] - initial query from given glob pattern
*/
export const WatchFileRequestType = new RequestType<WatchFileRequestParams, URILike[], never>('watch/reqeust')
/** client -> server */
export const WatchFileAddedNotificationType = new NotificationType<URILike>('watch/added')
/** client -> server */
export const WatchFileChangedNotificationType = new NotificationType<URILike>('watch/changed')
/** client -> server */
export const WatchFileDeletedNotificationType = new NotificationType<URILike>('watch/deleted')

/** currently only 'success', 'notExist' are used */
export type disposeResult = 'success' | 'notExist' | 'fail'
/**
 * server -> client  
 * request type to dispose watcher that is previously requested
 */
export const disposeWatchFileRequestType = new RequestType<WatchFileRequestParams, disposeResult, undefined>('watch/dispose')