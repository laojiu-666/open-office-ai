/**
 * 同步模块类型定义
 */

import type { SyncSnapshot, SyncStatus, SyncMetadata } from '@/types';

/**
 * WebDAV 连接配置
 */
export interface WebDavConnectionConfig {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string;
}

/**
 * WebDAV 文件信息
 */
export interface WebDavFileInfo {
  etag?: string;
  lastModified?: number;
  contentLength?: number;
  exists: boolean;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  error?: string;
  snapshot?: SyncSnapshot;
  remoteInfo?: WebDavFileInfo;
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  localSnapshot: SyncSnapshot;
  remoteSnapshot: SyncSnapshot;
  localMetadata: SyncMetadata;
  remoteMetadata: SyncMetadata;
}

/**
 * 冲突解决策略
 */
export type ConflictResolution = 'keep-local' | 'keep-remote' | 'merge';

/**
 * 同步事件类型
 */
export type SyncEventType =
  | 'sync-start'
  | 'sync-progress'
  | 'sync-success'
  | 'sync-error'
  | 'sync-conflict'
  | 'sync-offline';

/**
 * 同步事件
 */
export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * 同步事件监听器
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * 本地缓存接口
 */
export interface ILocalCache {
  load(): Promise<SyncSnapshot | null>;
  save(snapshot: SyncSnapshot): Promise<void>;
  clear(): Promise<void>;
  getMetadata(): Promise<SyncMetadata | null>;
}

/**
 * 远端存储接口
 */
export interface IRemoteStore {
  read(): Promise<SyncSnapshot | null>;
  write(snapshot: SyncSnapshot, etag?: string): Promise<WebDavFileInfo>;
  stat(): Promise<WebDavFileInfo>;
  testConnection(): Promise<boolean>;
}
