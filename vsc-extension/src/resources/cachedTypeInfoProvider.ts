import * as cp from 'child_process'
import * as crypto from 'crypto'
import dayjs from 'dayjs'
import { mkdirSync } from 'fs'
import * as fs from 'fs/promises'
import _ from 'lodash'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import { inject, injectable } from 'tsyringe'
import * as vscode from 'vscode'
import { LanguageClient } from 'vscode-languageclient'
import winston from 'winston'
import { TypeInfoRequest, TypeInfoRequestResponse } from '../events'
import { className, log, logFormat } from '../log'
import { md5sum } from '../utils/hash'
import jsonStr from '../utils/json'
import { PathStore } from './pathStore'
import { Provider } from './provider'
import { TypeInfoProvider } from './typeInfoProvider'

interface Cache {
  extractorVersion: string // semver
  createdBy: string
  createdAt: string // iso8601 format datetime

  requestedFileUris: string[]
  checksums: string[] // length is equal to rqeustedFileUris field

  data: any
}

@injectable()
export class CachedTypeInfoProvider implements Provider {
  private log = winston.createLogger({
    format: winston.format.combine(className(CachedTypeInfoProvider), logFormat),
    transports: [log],
  })

  // TODO: move this line to extractor.
  private static readonly extractorVersion = new semver.SemVer('0.9.0')

  get dllCacheDirectory(): string {
    return path.join(this.pathStore.cacheDirectory, 'dlls')
  }

  constructor(
    private readonly typeInfoProvider: TypeInfoProvider,
    @inject(PathStore.token) private readonly pathStore: PathStore
  ) {
    mkdirSync(this.dllCacheDirectory, { recursive: true })

    vscode.commands.registerCommand('rwxml:cache:clear', this.clearCache.bind(this))
    vscode.commands.registerCommand('rwxml:cache:openDir', this.openCacheDir.bind(this))
  }

  private openCacheDir(): void {
    const platform = os.platform()
    switch (platform) {
      case 'win32':
        cp.execSync(`start ${this.dllCacheDirectory}`, { shell: 'cmd.exe' })
        return

      case 'darwin':
        cp.execSync(`open ${this.dllCacheDirectory}`)
        return

      default:
        throw new Error(`platform ${platform} not supported. Please make an issue on github.`)
    }
  }

  private async clearCache(): Promise<void> {
    const caches = await fs.readdir(this.dllCacheDirectory)
    this.log.debug(`deleting ${caches.length} caches: ${jsonStr(caches)}`)
    await Promise.all(caches.map((c) => fs.rm(path.join(this.dllCacheDirectory, c))))

    vscode.window.showInformationMessage(`RWXML: Cleared ${caches.length} caches.`, 'OK')
  }

  async listen(client: LanguageClient): Promise<void> {
    await client.onReady()
    client.onRequest(TypeInfoRequest, this.onTypeInfoRequest.bind(this))
  }

  /**
   * @todo check cache confliction on write
   */
  private async onTypeInfoRequest({ uris, version }: TypeInfoRequest): Promise<TypeInfoRequestResponse> {
    this.log.info(`Received TypeInfo request for version: ${version}, uris: ${uris.length}`)

    // 1. 获取基础官方元数据包 (1.6)
    const baseData = await this.getBaseMetadata();
    
    // 2. 扫描工作区定义的静态包 (项目目录/Metadata/*.json)
    const workspaceStaticData = await this.getWorkspaceStaticMetadata();

    // 3. 对于传入的每个 URI (DLL)，独立处理缓存或提取
    const workspaceTypeInfos: any[] = [];
    const missingUris: string[] = [];

    for (const uri of uris) {
      const cacheData = await this.getCacheForUri(uri);
      if (cacheData) {
        workspaceTypeInfos.push(...cacheData);
      } else {
        missingUris.push(uri);
      }
    }

    // 4. 对缺失的 DLL 进行增量提取
    if (missingUris.length > 0) {
      this.log.info(`Cache miss for ${missingUris.length} DLLs. Starting incremental extraction...`);
      const res = await this.typeInfoProvider.onTypeInfoRequest({ uris: missingUris, version });
      
      if (!(res instanceof Error)) {
        const newData = (res as any).data;
        workspaceTypeInfos.push(...newData);
        
        // 保存缓存时使用更具辨识度的文件名
        await this.saveIncrementalCache(missingUris, newData);
      }
    }

    const combinedData = [...baseData, ...workspaceStaticData, ...workspaceTypeInfos];
    this.log.info(`Total types: ${combinedData.length} (Base: ${baseData.length}, Static: ${workspaceStaticData.length}, Dynamic: ${workspaceTypeInfos.length}).`);

    return { data: combinedData };
  }

  private async getWorkspaceStaticMetadata(): Promise<any[]> {
    const results: any[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    for (const folder of workspaceFolders) {
      const metadataDir = path.join(folder.uri.fsPath, 'Metadata');
      try {
        const files = await fs.readdir(metadataDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(metadataDir, file), 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
              this.log.info(`Loaded workspace static package: ${file} (${data.length} types)`);
              results.push(...data);
            }
          }
        }
      } catch (e) {
        // Directory doesn't exist or other error, ignore
      }
    }
    return results;
  }

  private getCachePathForUri(uri: string): string {
    const fileName = path.basename(vscode.Uri.parse(uri).fsPath);
    const shortHash = crypto.createHash('md5').update(uri).digest('hex').slice(0, 8);
    // 命名格式：FileName-Hash.json
    return path.join(this.dllCacheDirectory, `${fileName}-${shortHash}.json`);
  }

  private async getCacheForUri(uri: string): Promise<any[] | null> {
    const cachePath = this.getCachePathForUri(uri);

    try {
      const stats = await fs.stat(vscode.Uri.parse(uri).fsPath);
      const cacheBuffer = await fs.readFile(cachePath);
      const cache: Cache = JSON.parse(cacheBuffer.toString('utf-8'));

      const currentChecksum = `${stats.mtimeMs}-${stats.size}`;
      if (cache.checksums[0] === currentChecksum) {
        return cache.data;
      }
    } catch (e) {}
    return null;
  }

  private async saveIncrementalCache(uris: string[], data: any): Promise<void> {
    // 如果是单 DLL 提取，则保存精准缓存
    if (uris.length === 1) {
      const uri = uris[0];
      const cachePath = this.getCachePathForUri(uri);
      try {
        const stats = await fs.stat(vscode.Uri.parse(uri).fsPath);
        const checksum = `${stats.mtimeMs}-${stats.size}`;
        const cache: Cache = {
          extractorVersion: CachedTypeInfoProvider.extractorVersion.format(),
          checksums: [checksum],
          createdAt: dayjs().format(),
          createdBy: CachedTypeInfoProvider.name,
          data: data,
          requestedFileUris: [uri],
        }
        await fs.writeFile(cachePath, jsonStr(cache));
        this.log.info(`Saved identified cache: ${path.basename(cachePath)}`);
      } catch (e) {}
    } else {
      // 如果是多 DLL 批量提取，暂时存为 generic 块
      const hash = crypto.createHash('md5').update(uris.join(',')).digest('hex').slice(0, 12);
      const cachePath = path.join(this.dllCacheDirectory, `batch-${hash}.json`);
      const cache: Cache = {
        extractorVersion: CachedTypeInfoProvider.extractorVersion.format(),
        checksums: ['batch-no-checksum'],
        createdAt: dayjs().format(),
        createdBy: CachedTypeInfoProvider.name,
        data: data,
        requestedFileUris: uris,
      }
      await fs.writeFile(cachePath, jsonStr(cache));
    }
  }

  private async getBaseMetadata(): Promise<any[]> {
    const localMetadataPath = 'D:/RimworldProject/rwxml-language-server-master/rimworld-defs-metadata-1.6.json';
    try {
      const buffer = await fs.readFile(localMetadataPath);
      let content = "";
      if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le', 2);
      } else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        content = buffer.toString('utf8', 3);
      } else {
        content = buffer.toString('utf8');
      }
      content = content.trim();
      if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
      return JSON.parse(content);
    } catch (e) {
      this.log.error(`Error loading base metadata: ${e}`);
      return [];
    }
  }
}
