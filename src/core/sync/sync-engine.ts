/**
 * 同步引擎
 * 协调本地缓存、远端存储和状态机，执行同步操作
 */

import type { SyncSnapshot, VaultPayload, WebDavConfig } from '@/types';
import type {
  ILocalCache,
  IRemoteStore,
  SyncResult,
  ConflictInfo,
  ConflictResolution,
  WebDavConnectionConfig,
  SyncEventListener,
} from './types';
import { createLocalCache } from './local-cache';
import { createWebDavStore } from './webdav-store';
import { SyncStateMachine } from './sync-state-machine';
import { detectConflict, createConflictInfo, resolveConflict } from './conflict-resolver';
import { encryptVault, decryptVault, updateVault } from '../crypto/vault';

/**
 * 同步引擎配置
 */
export interface SyncEngineConfig {
  webDavConfig: WebDavConfig;
  password: string;
}

/**
 * 同步引擎
 */
export class SyncEngine {
  private localCache: ILocalCache;
  private remoteStore: IRemoteStore | null = null;
  private stateMachine: SyncStateMachine;
  private password: string | null = null;
  private lastSyncedRevision: number | null = null;
  private pendingConflict: ConflictInfo | null = null;

  constructor() {
    this.localCache = createLocalCache();
    this.stateMachine = new SyncStateMachine();
  }

  /**
   * 初始化同步引擎
   */
  async initialize(config: SyncEngineConfig): Promise<void> {
    this.password = config.password;

    if (config.webDavConfig.enabled) {
      const connectionConfig: WebDavConnectionConfig = {
        serverUrl: config.webDavConfig.serverUrl,
        username: config.webDavConfig.username,
        password: config.password, // WebDAV 密码与主密码分开
        remotePath: config.webDavConfig.remotePath,
      };
      this.remoteStore = createWebDavStore(connectionConfig);
    }
  }

  /**
   * 配置 WebDAV 连接（运行时更新）
   */
  configureWebDav(config: WebDavConnectionConfig): void {
    this.remoteStore = createWebDavStore(config);
  }

  /**
   * 设置主密码
   */
  setPassword(password: string): void {
    this.password = password;
  }

  /**
   * 获取当前同步状态
   */
  getStatus() {
    return this.stateMachine.getState();
  }

  /**
   * 添加事件监听器
   */
  addListener(listener: SyncEventListener): () => void {
    return this.stateMachine.addListener(listener);
  }

  /**
   * 测试 WebDAV 连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.remoteStore) {
      return false;
    }
    return this.remoteStore.testConnection();
  }

  /**
   * 执行同步
   */
  async sync(): Promise<SyncResult> {
    if (!this.password) {
      return {
        success: false,
        status: 'error',
        error: 'Password not set',
      };
    }

    if (!this.remoteStore) {
      return {
        success: false,
        status: 'offline',
        error: 'WebDAV not configured',
      };
    }

    if (this.stateMachine.isActive()) {
      return {
        success: false,
        status: this.stateMachine.getState(),
        error: 'Sync already in progress',
      };
    }

    this.stateMachine.transitionTo('checking');

    try {
      // 1. 获取本地和远端状态
      const [localSnapshot, remoteInfo] = await Promise.all([
        this.localCache.load(),
        this.remoteStore.stat(),
      ]);

      // 2. 处理各种情况
      if (!remoteInfo.exists) {
        // 远端不存在，上传本地数据
        return await this.uploadLocal(localSnapshot);
      }

      if (!localSnapshot) {
        // 本地不存在，下载远端数据
        return await this.downloadRemote();
      }

      // 3. 检查冲突
      const remoteSnapshot = await this.remoteStore.read();
      if (!remoteSnapshot) {
        return {
          success: false,
          status: 'error',
          error: 'Failed to read remote snapshot',
        };
      }

      const hasConflict = detectConflict(
        localSnapshot.metadata,
        remoteSnapshot.metadata,
        this.lastSyncedRevision ?? undefined
      );

      if (hasConflict) {
        this.pendingConflict = createConflictInfo(localSnapshot, remoteSnapshot);
        this.stateMachine.transitionTo('conflict', this.pendingConflict);
        return {
          success: false,
          status: 'conflict',
          error: 'Conflict detected',
        };
      }

      // 4. 无冲突，执行同步
      if (remoteSnapshot.metadata.revision > localSnapshot.metadata.revision) {
        // 远端更新，下载
        return await this.downloadRemote();
      } else if (localSnapshot.metadata.revision > remoteSnapshot.metadata.revision) {
        // 本地更新，上传
        return await this.uploadLocal(localSnapshot, remoteInfo.etag);
      } else {
        // 已同步
        this.stateMachine.transitionTo('success');
        return {
          success: true,
          status: 'success',
          snapshot: localSnapshot,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Network error')) {
        this.stateMachine.transitionTo('offline');
        return {
          success: false,
          status: 'offline',
          error: errorMessage,
        };
      }

      this.stateMachine.transitionTo('error', errorMessage);
      return {
        success: false,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * 上传本地数据到远端
   */
  private async uploadLocal(
    localSnapshot: SyncSnapshot | null,
    etag?: string
  ): Promise<SyncResult> {
    this.stateMachine.transitionTo('syncing');

    if (!this.remoteStore) {
      throw new Error('Remote store not configured');
    }

    if (!localSnapshot) {
      // 创建空的 vault
      if (!this.password) {
        throw new Error('Password not set');
      }
      const emptyPayload: VaultPayload = {
        connections: [],
        activeConnectionId: null,
      };
      localSnapshot = await encryptVault(emptyPayload, this.password);
    }

    const remoteInfo = await this.remoteStore.write(localSnapshot, etag);
    await this.localCache.save(localSnapshot);
    this.lastSyncedRevision = localSnapshot.metadata.revision;

    this.stateMachine.transitionTo('success');
    return {
      success: true,
      status: 'success',
      snapshot: localSnapshot,
      remoteInfo,
    };
  }

  /**
   * 从远端下载数据
   */
  private async downloadRemote(): Promise<SyncResult> {
    this.stateMachine.transitionTo('syncing');

    if (!this.remoteStore) {
      throw new Error('Remote store not configured');
    }

    const remoteSnapshot = await this.remoteStore.read();
    if (!remoteSnapshot) {
      throw new Error('Failed to read remote snapshot');
    }

    await this.localCache.save(remoteSnapshot);
    this.lastSyncedRevision = remoteSnapshot.metadata.revision;

    this.stateMachine.transitionTo('success');
    return {
      success: true,
      status: 'success',
      snapshot: remoteSnapshot,
    };
  }

  /**
   * 解决冲突
   */
  async resolveConflict(resolution: ConflictResolution): Promise<SyncResult> {
    if (!this.pendingConflict) {
      return {
        success: false,
        status: 'error',
        error: 'No pending conflict',
      };
    }

    if (!this.remoteStore) {
      return {
        success: false,
        status: 'error',
        error: 'Remote store not configured',
      };
    }

    const resolvedSnapshot = resolveConflict(this.pendingConflict, resolution);
    this.pendingConflict = null;

    this.stateMachine.transitionTo('syncing');

    try {
      // 保存到本地和远端
      await this.localCache.save(resolvedSnapshot);
      await this.remoteStore.write(resolvedSnapshot);
      this.lastSyncedRevision = resolvedSnapshot.metadata.revision;

      this.stateMachine.transitionTo('success');
      return {
        success: true,
        status: 'success',
        snapshot: resolvedSnapshot,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.stateMachine.transitionTo('error', errorMessage);
      return {
        success: false,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * 获取待处理的冲突信息
   */
  getPendingConflict(): ConflictInfo | null {
    return this.pendingConflict;
  }

  /**
   * 保存数据（本地 + 可选同步）
   */
  async savePayload(payload: VaultPayload, autoSync: boolean = true): Promise<SyncResult> {
    if (!this.password) {
      return {
        success: false,
        status: 'error',
        error: 'Password not set',
      };
    }

    try {
      // 获取当前元数据
      const currentSnapshot = await this.localCache.load();
      const previousMetadata = currentSnapshot?.metadata;

      // 加密并保存
      const newSnapshot = await updateVault(payload, this.password, previousMetadata);
      await this.localCache.save(newSnapshot);

      // 自动同步
      if (autoSync && this.remoteStore) {
        return await this.sync();
      }

      return {
        success: true,
        status: 'idle',
        snapshot: newSnapshot,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * 加载数据
   */
  async loadPayload(): Promise<VaultPayload | null> {
    if (!this.password) {
      return null;
    }

    const snapshot = await this.localCache.load();
    if (!snapshot) {
      return null;
    }

    try {
      return await decryptVault(snapshot, this.password);
    } catch {
      return null;
    }
  }

  /**
   * 重置引擎状态
   */
  reset(): void {
    this.stateMachine.reset();
    this.pendingConflict = null;
    this.lastSyncedRevision = null;
  }
}

/**
 * 创建同步引擎实例
 */
export function createSyncEngine(): SyncEngine {
  return new SyncEngine();
}

// 单例实例
let syncEngineInstance: SyncEngine | null = null;

/**
 * 获取同步引擎单例
 */
export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = createSyncEngine();
  }
  return syncEngineInstance;
}
