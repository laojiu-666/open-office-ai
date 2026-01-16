/**
 * 本地缓存适配器
 * 使用 localStorage 存储加密后的配置数据
 */

import type { SyncSnapshot, SyncMetadata } from '@/types';
import type { ILocalCache } from './types';

const STORAGE_KEY = 'open-office-ai-vault';
const METADATA_KEY = 'open-office-ai-vault-metadata';

/**
 * localStorage 本地缓存实现
 */
export class LocalStorageCache implements ILocalCache {
  /**
   * 加载本地缓存的快照
   */
  async load(): Promise<SyncSnapshot | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as SyncSnapshot;
    } catch {
      return null;
    }
  }

  /**
   * 保存快照到本地缓存
   */
  async save(snapshot: SyncSnapshot): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    // 同时保存元数据（用于快速检查）
    localStorage.setItem(METADATA_KEY, JSON.stringify(snapshot.metadata));
  }

  /**
   * 清除本地缓存
   */
  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(METADATA_KEY);
  }

  /**
   * 获取元数据（不加载完整快照）
   */
  async getMetadata(): Promise<SyncMetadata | null> {
    try {
      const data = localStorage.getItem(METADATA_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as SyncMetadata;
    } catch {
      return null;
    }
  }
}

/**
 * 创建本地缓存实例
 */
export function createLocalCache(): ILocalCache {
  return new LocalStorageCache();
}

/**
 * 检查是否有本地缓存
 */
export function hasLocalCache(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * 获取本地缓存的 revision
 */
export function getLocalRevision(): number | null {
  try {
    const data = localStorage.getItem(METADATA_KEY);
    if (!data) {
      return null;
    }
    const metadata = JSON.parse(data) as SyncMetadata;
    return metadata.revision;
  } catch {
    return null;
  }
}
