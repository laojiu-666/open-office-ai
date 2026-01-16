/**
 * 冲突解决器
 * 处理本地与远端数据冲突
 */

import type { SyncSnapshot, SyncMetadata } from '@/types';
import type { ConflictInfo, ConflictResolution } from './types';

/**
 * 检测是否存在冲突
 * @param localMetadata 本地元数据
 * @param remoteMetadata 远端元数据
 * @param lastSyncedRevision 上次同步时的 revision
 */
export function detectConflict(
  localMetadata: SyncMetadata,
  remoteMetadata: SyncMetadata,
  lastSyncedRevision?: number
): boolean {
  // 如果远端 revision 大于本地，且本地有未同步的修改
  if (remoteMetadata.revision > localMetadata.revision) {
    // 本地没有修改（revision 等于上次同步时的 revision）
    if (lastSyncedRevision !== undefined && localMetadata.revision === lastSyncedRevision) {
      return false; // 可以直接拉取远端
    }
    // 本地有修改，产生冲突
    return true;
  }

  // 如果本地 revision 大于远端，说明本地有新修改，可以直接推送
  if (localMetadata.revision > remoteMetadata.revision) {
    return false;
  }

  // revision 相同，检查 updatedAt
  if (localMetadata.updatedAt !== remoteMetadata.updatedAt) {
    // 时间戳不同，可能是并发修改
    return true;
  }

  return false;
}

/**
 * 创建冲突信息
 */
export function createConflictInfo(
  localSnapshot: SyncSnapshot,
  remoteSnapshot: SyncSnapshot
): ConflictInfo {
  return {
    localSnapshot,
    remoteSnapshot,
    localMetadata: localSnapshot.metadata,
    remoteMetadata: remoteSnapshot.metadata,
  };
}

/**
 * 解决冲突
 * @param conflict 冲突信息
 * @param resolution 解决策略
 * @returns 解决后的快照
 */
export function resolveConflict(
  conflict: ConflictInfo,
  resolution: ConflictResolution
): SyncSnapshot {
  switch (resolution) {
    case 'keep-local':
      // 保留本地版本，但递增 revision 以覆盖远端
      return {
        ...conflict.localSnapshot,
        metadata: {
          ...conflict.localSnapshot.metadata,
          revision: Math.max(
            conflict.localMetadata.revision,
            conflict.remoteMetadata.revision
          ) + 1,
          updatedAt: Date.now(),
        },
      };

    case 'keep-remote':
      // 保留远端版本
      return conflict.remoteSnapshot;

    case 'merge':
      // 合并策略：目前简单地使用较新的版本
      // 未来可以实现更复杂的合并逻辑
      const localNewer = conflict.localMetadata.updatedAt > conflict.remoteMetadata.updatedAt;
      const baseSnapshot = localNewer ? conflict.localSnapshot : conflict.remoteSnapshot;

      return {
        ...baseSnapshot,
        metadata: {
          ...baseSnapshot.metadata,
          revision: Math.max(
            conflict.localMetadata.revision,
            conflict.remoteMetadata.revision
          ) + 1,
          updatedAt: Date.now(),
        },
      };

    default:
      throw new Error(`Unknown conflict resolution: ${resolution}`);
  }
}

/**
 * 获取冲突摘要信息（用于 UI 显示）
 */
export function getConflictSummary(conflict: ConflictInfo): {
  localInfo: string;
  remoteInfo: string;
  recommendation: ConflictResolution;
} {
  const localDate = new Date(conflict.localMetadata.updatedAt).toLocaleString();
  const remoteDate = new Date(conflict.remoteMetadata.updatedAt).toLocaleString();

  const localInfo = `本地版本 (修改于 ${localDate}, revision: ${conflict.localMetadata.revision})`;
  const remoteInfo = `远端版本 (修改于 ${remoteDate}, revision: ${conflict.remoteMetadata.revision})`;

  // 推荐策略：选择较新的版本
  const recommendation: ConflictResolution =
    conflict.localMetadata.updatedAt > conflict.remoteMetadata.updatedAt
      ? 'keep-local'
      : 'keep-remote';

  return {
    localInfo,
    remoteInfo,
    recommendation,
  };
}
