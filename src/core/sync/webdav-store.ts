/**
 * WebDAV 远端存储适配器
 * 封装 WebDAV 客户端，提供统一的远端存储接口
 */

import type { SyncSnapshot } from '@/types';
import type { IRemoteStore, WebDavConnectionConfig, WebDavFileInfo } from './types';
import { WebDavClient } from './webdav-client';

/**
 * WebDAV 远端存储实现
 */
export class WebDavStore implements IRemoteStore {
  private client: WebDavClient;

  constructor(config: WebDavConnectionConfig) {
    this.client = new WebDavClient(config);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * 获取远端文件信息
   */
  async stat(): Promise<WebDavFileInfo> {
    return this.client.stat();
  }

  /**
   * 读取远端快照
   */
  async read(): Promise<SyncSnapshot | null> {
    const content = await this.client.get();
    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content) as SyncSnapshot;
    } catch {
      throw new Error('Invalid remote snapshot format');
    }
  }

  /**
   * 写入远端快照
   * @param snapshot 要写入的快照
   * @param etag 可选的 ETag，用于条件更新（防止冲突）
   */
  async write(snapshot: SyncSnapshot, etag?: string): Promise<WebDavFileInfo> {
    // 确保目录存在
    await this.client.ensureDirectory();

    // 写入文件
    const content = JSON.stringify(snapshot, null, 2);
    return this.client.put(content, undefined, etag);
  }
}

/**
 * 创建 WebDAV 远端存储实例
 */
export function createWebDavStore(config: WebDavConnectionConfig): IRemoteStore {
  return new WebDavStore(config);
}
